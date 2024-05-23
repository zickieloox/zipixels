import {spawn} from 'child_process';
import {promises as fs} from 'fs';
import {SVG, registerWindow} from '@svgdotjs/svg.js';
import * as base64Img from 'base64-img';
import sharp from 'sharp';
import axios from 'axios';
import * as path from 'path';

interface ImageData {
  images: Image[];
  fileName: string;
  scale: number;
  screenShot: string;
}

interface Image {
  svgPath?: string;
  groupName: string;
  layerHastag: string;
  imagePath?: string;
  width: number;
  height: number;
  scaleX?: number;
  scaleY?: number;
  x?: number;
  y?: number;
  text?: string;
}

async function handleExportImage(event, data: string) {
  try {
    const imageData: ImageData = JSON.parse(data);
    console.log('=== Received images data in main process for ExportImage');
    const startTime = Date.now();
    // const currentDirectory = process.cwd();
    // if (!currentDirectory.endsWith("tebpixels-be") && !currentDirectory.endsWith("tebpixels")) {
    //   process.chdir('..');
    //   console.log('Changed directory to the parent directory.');
    // }

    const groupSvgPaths: {[key: string]: string[]} = {};
    const texts: Image[] = [];
    const backgroundPaths: Image[] = [];
    const imageHashTag: {[key: string]: Image[]} = {};

    imageData?.images.forEach(image => {
      if (image.svgPath && `${image.groupName}`.toLowerCase().includes('vector')) {
        groupSvgPaths[image.layerHastag]
          ? groupSvgPaths[image.layerHastag].push(image.svgPath)
          : (groupSvgPaths[image.layerHastag] = [image.svgPath]);
      } else if (
        image.imagePath &&
        (`${image.groupName}`.toLowerCase().includes('background') ||
          `${image.groupName}`.toLowerCase().includes('color'))
      ) {
        const innerLayer = getInnerLayer(imageData);
        backgroundPaths.push({...image, cut: innerLayer});
      } else if (image.text) {
        texts.push(image);
      } else {
        if (imageHashTag[image.layerHastag]) {
          imageHashTag[image.layerHastag].push(image);
        } else {
          imageHashTag[image.layerHastag] = [image];
        }
      }
    });

    if (imageData?.fileName !== 'export_image.png') {
      checkOutputFolder(path.join('data', 'export'));
      const outputPromise: Promise<void>[] = [];
      const scale = Number(imageData.scale).toFixed(2) || 1;
      outputPromise.push(createBackgroundImage(backgroundPaths, imageData.fileName, scale));
      outputPromise.push(createSVGFiles(groupSvgPaths, imageData.fileName, scale));
      outputPromise.push(createImageLayers(imageHashTag, imageData.fileName, texts, scale));

      await Promise.all(outputPromise);
    } else {
      await createExportImage(imageData.screenShot);
    }

    console.log('Elapsed time: ' + (Date.now() - startTime) + 'ms');
    return event.reply('process-psd-done', {
      success: true,
      message: 'Process finished successfully',
    });
  } catch (error) {
    console.log(error);
    return event.reply('process-psd-done', {
      success: false,
      message: 'Process finished failed',
    });
  }
}

async function createExportImage(screenShot: string) {
  if (!screenShot || screenShot === null) return;

  const outputPath = 'data/output';
  const folderExists = await fs.readdir(outputPath);
  if (!folderExists) {
    await fs.mkdir(path.join(outputFolder, 'images'), {recursive: true});
  }

  const bufferData = Buffer.from(screenShot.replace(`data:image/png;base64,`, ''), 'base64');
  await sharp(bufferData).toFile(`${outputPath}/export_image.png`);

  return true;
}

async function createBackgroundImage(backgroundPaths: Image[], fileName: string, scale = 1) {
  const background = backgroundPaths[0];

  if (!background) return;

  const outputPath = `data/export/${fileName.replace('.png', '')}-#${background.layerHastag || 1}`;

  let bufferData;
  if (background.imagePath?.startsWith('https://')) {
    const response = await axios.get(background.imagePath, {responseType: 'arraybuffer'});
    bufferData = Buffer.from(response.data, 'binary');
  } else {
    const fileBase64Img = await fs.readFile(background.imagePath, 'base64');
    const bufferFrom = fileBase64Img.replace(`data:image/png;base64,`, '');
    bufferData = Buffer.from(bufferFrom, 'base64');
  }

  await sharp(bufferData)
    .resize({
      width: Math.round((background.scaleX || 1) * background.width * scale),
      height: Math.round((background.scaleY || 1) * background.height * scale),
      fit: 'fill',
    })
    .png()
    .toFile(`${outputPath}.png`);
}

async function createSVGFiles(
  groupSvgPaths: {[key: string]: string[]},
  fileName: string,
  scale = 1,
) {
  for (const layerHastag in groupSvgPaths) {
    const svgPaths = groupSvgPaths[layerHastag] || [];
    if (svgPaths.length > 0) {
      const outputPath = `data/export/${fileName.replace('.png', '')}-#${layerHastag || 'image'}`;
      const {createSVGWindow} = await import('svgdom');
      const window = createSVGWindow();
      const document = window.document;
      registerWindow(window, document);
      const canvas = SVG(document.documentElement);
      const svg = SVG();
      for (const svgPath of svgPaths) {
        let svgString;

        if (svgPath.startsWith('https://')) {
          svgString = await (await fetch(svgPath)).text();
        } else {
          svgString = await fs.readFile(svgPath, 'utf-8');
        }

        canvas.clear();
        canvas.svg(svgString);
        const viewBox = document.querySelector('svg').childNodes[0].getAttribute('viewBox');
        const rasterImage = document.querySelector(`path`);
        svg.viewbox(viewBox);
        svg.add(rasterImage);

        if (scale !== 1) {
          const currentTransform = rasterImage.getAttribute('transform') || '';
          rasterImage.setAttribute('transform', `${currentTransform} scale(${scale})`);
          const [x, y, width, height] = viewBox.split(' ');
          svg.viewbox([x, y, width * scale, height * scale].join(' '));
        }
      }

      const rawItemSvgString = svg.svg();
      const rawBase64Data =
        'data:image/svg+xml;base64,' + Buffer.from(rawItemSvgString).toString('base64');
      base64Img.imgSync(rawBase64Data, '.', outputPath);
    }
  }
}

async function createImageLayers(
  imageHashTags: {[key: string]: Image[]},
  fileName: string,
  texts: Image[],
  scale = 1,
) {
  for (const imageHashTag in imageHashTags) {
    const outputPath = `data/export/${fileName.replace('.png', '')}-#${imageHashTag || 'image'}`;
    const images = imageHashTags[imageHashTag];
    const compositeImages = [];
    let maxWidth = 0;
    let maxHeight = 0;
    let minX = Infinity;
    let minY = Infinity;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      maxWidth = Math.max(maxWidth, Math.round(image.width * image.scaleX * scale + image.x));
      maxHeight = Math.max(maxHeight, Math.round(image.height * image.scaleY * scale + image.y));
      minX = Math.min(minX, Math.round(image.x));
      minY = Math.min(minY, Math.round(image.y));
    }

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      let sharpImage;
      if (image.imagePath.startsWith('https://')) {
        const response = await axios.get(image.imagePath, {responseType: 'arraybuffer'});
        sharpImage = sharp(Buffer.from(response.data, 'binary'));
      } else {
        sharpImage = sharp(image.imagePath);
      }

      compositeImages.push({
        input: await sharpImage
          .resize({
            width: Math.round(image.width * image.scaleX * scale),
            height: Math.round(image.height * image.scaleY * scale),
          })
          .toBuffer(),
        top: Math.round(image.y) - minY,
        left: Math.round(image.x) - minX,
      });
    }

    const compositeTexts: any[] = [];
    for (let i = 0; i < texts.length; i++) {
      const textData = texts[i];
      const bufferData = Buffer.from(
        textData.imagePath.replace(`data:image/png;base64,`, ''),
        'base64',
      );

      // Save bufferData as text.png
      // await fs.writeFile(`${i}-text.png`, bufferData);

      compositeImages.push({
        input: await sharp(bufferData)
          .resize({
            width: Math.round(textData.width * textData.scaleX),
            height: Math.round(textData.height * textData.scaleY),
          })
          .toBuffer(),
        top: Math.round(textData.y * scale) - minY,
        left: Math.round(textData.x * scale) - minX,
      });
    }

    await sharp({
      create: {
        width: maxWidth - minX,
        height: maxHeight - minY,
        channels: 4,
        background: {r: 255, g: 255, b: 255, alpha: 0},
      },
    })
      .composite([...compositeImages, ...compositeTexts])
      .png({quality: 100})
      .toFile(`${outputPath}.png`);
  }
}

function getInnerLayer(imageData: ImageData) {
  let x = Infinity;
  let y = Infinity;
  let width = 0;
  let height = 0;

  for (const image of imageData.images) {
    if (image.x === 0 && image.y === 0) {
      continue;
    }

    x = Math.min(x, image.x);
    y = Math.min(y, image.y);
    width = Math.max(width, image.width);
    height = Math.max(height, image.height);
  }

  return {x, y, width, height};
}

const checkOutputFolder = async (outputFolder: string) => {
  try {
    const files = await fs.readdir(outputFolder);
    if (files.length > 0) {
      await fs.rm(outputFolder, {recursive: true});
      console.log('All files deleted.');
      await fs.mkdir(outputFolder);
      await fs.mkdir(`${outputFolder}/images`);
      console.log('Created new directory.');
    }
  } catch (error) {
    await fs.mkdir(path.join(outputFolder, 'images'), {recursive: true});
  }
};

export {handleExportImage};
