import {SVG, registerWindow} from '@svgdotjs/svg.js';
import * as base64Img from 'base64-img';
import axios from 'axios';
import {promises as fs} from 'fs';

interface PSDLayer {
  name: string;
  children?: PSDLayer[];
  kind: string;
  text_data?: {
    text: string;
    font_name: string;
    font_size: number;
  };
  image_path?: string;
  translateX?: number;
  translateY?: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  width: number;
  height: number;
  fill_color?: string;
}

interface PSDData {
  layers: PSDLayer[];
}

async function handleDownloadSvg(event, psdData: PSDData) {
  if (!psdData) {
    return;
  }

  console.log('=== Received files paths in main process for PSD data to SVG ===');

  try {
    // const outputZipPath = path.join(process.cwd(), 'data', 'data.zip');
    const outputFolder = 'data/download';
    await checkOutputFolder(outputFolder);
    createSVGFile(psdData, outputFolder);
    return event.reply('process-psd-done', {
      success: true,
      message: 'Create SVG success',
    });
  } catch (error) {
    console.log('Create SVG error:', error);
    event.reply('process-psd-done', {
      success: false,
      message: 'Create SVG fail',
    });
  }
}

const createSVGFile = async (psdData: PSDData, outputFolder = 'data/download') => {
  const {createSVGWindow} = await import('svgdom');
  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);
  // const canvas = SVG(document.documentElement);
  const svg = SVG();

  const imagePromises: Promise<void>[] = [];
  for (const layer of psdData.layers) {
    if (layer.children && layer.children.length > 0) {
      const newGroup = svg.group().id(layer.name);
      for (let i = 0; i < layer.children.length; i++) {
        const child = layer.children[i];
        if (!child) return;

        if (child.kind === 'type' && child.text_data) {
          const newTextElement = svg.text().plain(child.text_data.text);
          const translateX = child.translateX || child.x || 0;
          const translateY = child.translateY || child.y || 0;

          newTextElement.attr(
            'style',
            `font-family:${child.text_data.font_name.replaceAll('"', "'")};font-size:${
              child.text_data.font_size
            }px`,
          );
          newTextElement.attr('data-name', child.name);
          newTextElement.scale(child.scaleX || 1, child.scaleY || 1, 0, 0);
          newTextElement.translate(translateX, translateY);
          newGroup.add(newTextElement);
        } else if (child.kind === 'pixel') {
          fetchImage(child.image_path, child.name, outputFolder, imagePromises);
          const newImageElement = svg.image().id(child.name);
          const translateX = child.translateX || child.x || 0;
          const translateY = child.translateY || child.y || 0;

          newImageElement.attr('xlink:href', `${child.name}.png`);
          newImageElement.attr('width', child.width);
          newImageElement.attr('height', child.height);
          newImageElement.attr('style', 'overflow:visible');
          newImageElement.attr('data-name', child.name);
          newImageElement.scale(child.scaleX || 1, child.scaleY || 1, 0, 0);
          newImageElement.translate(translateX, translateY);

          // Handle special case
          if (['choose color', 'color'].includes(layer.name.toLowerCase())) {
            newImageElement.attr(
              'style',
              `stroke:#000;stroke-miterlimit:10;stroke-width:5px;fill:${child.fill_color}`,
            );
          }

          newGroup.add(newImageElement);
        }
      }
      svg.add(newGroup);
    }
  }
  await Promise.all(imagePromises);

  const rawItemSvgString = svg.svg();
  const rawBase64Data =
    'data:image/svg+xml;base64,' + Buffer.from(rawItemSvgString).toString('base64');
  base64Img.imgSync(rawBase64Data, '.', `${outputFolder}/download`);
};

const fetchImage = async (
  url: string | undefined,
  name: string,
  outputFolder = 'data/download',
  imagePromises: Promise<void>[] = [],
) => {
  if (!url) return;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  const filePath = `${outputFolder}/${name}.png`;
  imagePromises.push(fs.writeFile(filePath, response.data));
};

const checkOutputFolder = async (outputFolder: string) => {
  try {
    const files = await fs.readdir(outputFolder);
    if (files.length > 0) {
      await fs.rm(outputFolder, {recursive: true});
      console.log('All files deleted.');
      await fs.mkdir(outputFolder);
      console.log('Created new directory.');
    }
  } catch (error) {
    await fs.mkdir(outputFolder, {recursive: true});
  }
};

export {handleDownloadSvg};
