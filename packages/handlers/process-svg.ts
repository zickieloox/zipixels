import {SVG, registerWindow} from '@svgdotjs/svg.js';
import base64Img from 'base64-img';
import sharp from 'sharp';
import fs from 'fs/promises';
import svg2img from 'svg2img';
import {optimize} from 'svgo';
import path from 'path';

type SvgLayer = {
  name: string;
  layerId: string;
  visible: boolean;
  opacity: number;
  blend_mode: 'NORMAL' | string; // Assuming 'NORMAL' is a default but can be other string values
  kind: 'pixel' | string; // Assuming 'pixel' is a default but can be other string values
  width: number;
  height: number;
  x: number;
  y: number;
  children: null | SvgLayer[]; // Assuming children can be null or an array of Layers
  is_group: boolean;
  image_path: string | null;
  crop_image_path: string | null;
  text_data: null | object; // Assuming text_data can be null or an object (define the object structure if known)
  raw_image_path: string | null;
  z_index?: null | number;
  thumb_image_path: string | null;
  fill_color?: string;
  svg_path?: null | string;
  scaleX?: null | number;
  scaleY?: null | number;
  skewY?: null | number;
  skewX?: null | number;
  translateX?: number;
  translateY?: number;
};

// Optimize and minify svg which using Adobe Illustrator Save as with "Preserve Illustrator Editing Capabilities"
const SVGOOptimize = svgString => {
  return optimize(svgString, {
    multipass: true,
    plugins: [
      {
        name: 'removeDoctype',
      },
      {
        name: 'removeXMLProcInst',
      },
      {
        name: 'removeComments',
      },
      {
        name: 'removeMetadata',
      },
      {
        name: 'removeEditorsNSData',
      },
      {
        name: 'cleanupAttrs',
      },
      {
        name: 'mergeStyles',
      },
      {
        name: 'inlineStyles',
      },
      {
        name: 'minifyStyles',
      },
      {
        name: 'cleanupNumericValues',
      },
      {
        name: 'convertColors',
      },
      {
        name: 'removeUselessStrokeAndFill',
      },
      {
        name: 'removeViewBox',
      },
      {
        name: 'cleanupEnableBackground',
      },
      {
        name: 'removeEmptyText',
      },
      {
        name: 'convertShapeToPath',
      },
      // {
      //     name: "moveElemsAttrsToGroup",
      // },
      {
        name: 'moveGroupAttrsToElems',
      },
      {
        name: 'convertPathData',
      },
      {
        name: 'convertEllipseToCircle',
      },
      // {
      // name: "convertTransform",
      // },
      {
        name: 'removeEmptyAttrs',
      },
      {
        name: 'removeEmptyContainers',
      },
      {
        name: 'mergePaths',
      },
      {
        name: 'removeUnusedNS',
      },
      {
        name: 'sortAttrs',
      },
      {
        name: 'sortDefsChildren',
      },
      {
        name: 'removeTitle',
      },
      {
        name: 'removeDesc',
      },
      {
        name: 'removeDimensions',
      },
    ],
  }).data;
};

async function handleProcessSvg(event, filePath) {
  try {
    if (!filePath) {
      return;
    }
    console.log('=== Received files paths in main process for Process SVG:', filePath);
    // const currentDirectory = process.cwd();

    // if (!currentDirectory.endsWith("tebpixels-be") && !currentDirectory.endsWith("tebpixels")) {
    //     process.chdir('..');
    //     console.log('Changed directory to the parent directory.');
    // }

    const startTime = Date.now();

    const outputFolder = 'data/output';
    const psdData = await processSvg(filePath, outputFolder);
    await processLayer(psdData.layers);

    console.log('Elapsed time: ' + (Date.now() - startTime) + 'ms');
    event.reply('process-psd-done', {
      success: true,
      message: 'Process finished successfully',
      data: psdData,
    });
  } catch (error) {
    console.log('Process SVG error:', error);
    event.reply('process-psd-done', {
      success: false,
      // message: "Missing image(s)",
      message: error,
    });
  }
}

const createImageText = async (outputPath, thumbOutputPath, cropOutputPath, text) => {
  const width = 200;
  const height = 200;
  const textImage = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: {r: 255, g: 255, b: 255, alpha: 1},
    },
  }).composite([
    {
      input: {
        text: {
          text: `<span foreground="black" size="x-large"><i>${text}</i></span>`,
          font: 'Arial',
          align: 'center',
          width: width,
          height: height * 0.8,
          rgba: true,
        },
      },
      top: height * 0.1,
      left: 0,
    },
  ]);
  await textImage.png().toFile(`${outputPath}.png`);
  await textImage.webp().toFile(thumbOutputPath);
  await textImage.trim().webp().toFile(cropOutputPath);
};

const createColorImage = async (outputPath, thumbOutputPath, color, width = 100, height = 100) => {
  const textImage = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: color,
    },
  });
  await textImage.png().toFile(`${outputPath}.png`);
  await textImage.webp().toFile(thumbOutputPath);
};

const createImageAndThumbnail = async (
  base64Data,
  outputPath,
  thumbOutputPath,
  imageFormat = 'png',
  filePath = '',
  cropPath = '',
) => {
  if (!base64Data) {
    return;
  }

  try {
    if (imageFormat === 'svg+xml') {
      svg2img(base64Data, function (error, buffer) {
        if (error) {
          console.error('Error converting SVG to PNG:', error);
        } else {
          fs.writeFile(`${outputPath}.png`, buffer);
          fs.writeFile(thumbOutputPath, buffer);
          fs.writeFile(cropPath, buffer);
        }
      });
    } else if (typeof base64Data === 'string' && base64Data.includes('.png')) {
      const folderSlash = filePath.includes('/') ? '/' : '\\';
      const folderPath = filePath.split(folderSlash).slice(0, -1).join(folderSlash);
      const imagePath = `${folderPath}${folderSlash}${base64Data.replaceAll('%20', ' ')}`;
      const image = sharp(imagePath);
      await Promise.all([
        // image.png().toFile(`${outputPath}.${imageFormat}`),
        fs.copyFile(imagePath, `${outputPath}.${imageFormat}`),
        image.webp().toFile(thumbOutputPath),
        image.trim().webp().toFile(cropPath),
      ]);
    } else {
      base64Img.imgSync(base64Data, '.', outputPath);
      const bufferFrom = base64Data.replace(`data:image/${imageFormat};base64,`, '');
      const bufferData = Buffer.from(bufferFrom, 'base64');
      const image = sharp(bufferData);
      await Promise.all([
        image.webp().toFile(thumbOutputPath),
        image.trim().webp().toFile(cropPath),
      ]);
    }
  } catch (error) {
    console.log('Error creating image and thumbnail:', error);
  }
};

const processLayer = async layers => {
  for (const layer of layers) {
    if (layer.children && layer.children.length > 0) {
      await processLayer(layer.children);
    } else {
      if (layer.image_path) {
        const thumbImagePath = layer.thumb_image_path;
        const cropImagePath = layer.crop_image_path;

        if (thumbImagePath) {
          const thumbImageBlob = await fs.readFile(thumbImagePath, 'base64');
          layer.thumb_image_path = 'data:image/png;base64,' + thumbImageBlob;
        }

        if (cropImagePath) {
          const cropImageBlob = await fs.readFile(cropImagePath, 'base64');
          layer.crop_image_path = 'data:image/png;base64,' + cropImageBlob;
        }
      }
    }
  }
};

const saveToJson = async (layers, filePath, outputFolder) => {
  const data = {
    layers: layers,
    path: filePath,
    name: filePath.split('/').pop(),
    width: layers.width,
    height: layers.height,
    color_mode: 3,
    version: 1,
    layers_count: layers.length,
    missing_fonts: [],
  };
  await fs.writeFile(`${outputFolder}/psd_data.json`, JSON.stringify(data));

  return data;
};

const itemSvgStringFromPath = (pathData, viewBox, outputPath, rawOutputPath = '') => {
  const svg = SVG().viewbox(viewBox);
  svg.path(pathData);
  if (outputPath.toLowerCase().includes('vector')) {
    const path = svg.findOne('path');
    if (path) {
      path.stroke('red');
      path.fill('none');
    }
  }

  // raw
  const rawItemSvgString = svg.svg();
  const rawBase64Data =
    'data:image/svg+xml;base64,' + Buffer.from(rawItemSvgString).toString('base64');
  base64Img.imgSync(rawBase64Data, '.', rawOutputPath);

  // Parse SVG string to extract width and height
  const {width, height, x, y} = svg.bbox();

  const croppedViewBox: [number, number, number, number] = [x, y, width, height];

  svg.viewbox(...croppedViewBox);

  // Create SVG file
  const itemSvgString = svg.svg();
  const base64Data = 'data:image/svg+xml;base64,' + Buffer.from(itemSvgString).toString('base64');
  base64Img.imgSync(base64Data, '.', outputPath);

  return [itemSvgString, width, height, x, y];
};

const convertStringCssToObject = cssString => {
  const styles = {};

  cssString.split('}').forEach(cssBlock => {
    if (!cssBlock.trim()) return; // Skip empty blocks
    const [selector, properties] = cssBlock.split('{');
    const classNames = selector.split(',').map(className => className.trim().replace('.', ''));
    const styleObj = {};

    // Split properties and add to style object
    properties.split(';').forEach(property => {
      if (!property.trim()) return; // Skip empty properties
      const [name, value] = property.split(':').map(part => part.trim());
      styleObj[name] = value;
    });

    // Assign style object to each class name
    classNames.forEach(className => {
      styles[className] = {...styles[className], ...styleObj};
    });
  });

  return styles;
};

const convertStyleInlineCssToObject = cssString => {
  const styles = {};

  cssString.split(';').forEach(property => {
    const [name, value] = property.split(':').map(part => part.trim());
    styles[name] = value;
  });

  return styles;
};

const parseStringMatrix = matrixString => {
  const splitCharacter = matrixString.includes(',') ? ',' : ' ';
  const transformOfLayer = matrixString
    .replace(/matrix|\(|\)/g, '')
    .split(splitCharacter)
    .map(value => Number(value));
  return transformOfLayer;
};

const parseStringTransform = transformString => {
  let scaleX = 1;
  let scaleY = 1;
  let translateX = 0;
  let translateY = 0;
  const skewX = 0;
  const skewY = 0;
  let rotate = 0;

  const translateMatch = transformString.match(/translate\(([^)]+)\)/);
  if (translateMatch) {
    const splitCharacter = translateMatch[1].includes(',') ? ',' : ' ';
    const values = translateMatch[1].split(splitCharacter);
    translateX = parseFloat(values[0]) || 0;
    translateY = parseFloat(values[1]) || translateX;
  }

  const scaleMatch = transformString.match(/scale\(([^)]+)\)/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(',');
    scaleX = parseFloat(values[0]) || 1;
    scaleY = parseFloat(values[1]) || scaleX;
  }

  const rotateMatch = transformString.match(/rotate\(([^)]+)\)/);
  if (rotateMatch) {
    rotate = parseFloat(rotateMatch[1]) || 0;
  }

  return [scaleX, skewY, skewX, scaleY, translateX, translateY, rotate];
};

const extractSvg = async (filePath, outputFolder) => {
  let zIndex = 1;
  let backgroundTranslateX = Infinity;
  let backgroundTranslateY = Infinity;
  const {createSVGWindow} = await import('svgdom');
  const window = createSVGWindow();
  const svgString = await fs.readFile(filePath, 'utf-8');

  const optimizedSvgString = SVGOOptimize(svgString)
    .replace(
      `<switch><foreignObject width="1" height="1" x="0" y="0" requiredExtensions="http://ns.adobe.com/AdobeIllustrator/10.0/"/><g>`,
      '',
    )
    .replace('</g></switch>', '');

  await fs.writeFile('data/optimized.svg', optimizedSvgString);
  const document = window.document;
  registerWindow(window, document);

  const canvas = SVG(document.documentElement);

  canvas.svg(optimizedSvgString);
  const layers: SvgLayer[] = [];
  const style = document.querySelector('style');
  const viewBox = document.querySelector('svg')?.childNodes[0].getAttribute('viewBox');
  let styleObj =
    style && style.childNodes[0] ? convertStringCssToObject(style.childNodes[0].data) : null;
  const groups = document.querySelectorAll('g');
  const createImagePromises: Promise<void>[] = [];
  for (const group of groups) {
    zIndex++;
    const groupName = group.getAttribute('data-name') || group.id || '';
    const children: SvgLayer[] = [];
    for (const layer of group.childNodes) {
      if (!group.id) {
        continue;
      }
      const layerId = layer.id || randomString(8);
      let rasterImage: Element | ChildNode | null = document.querySelector(`#${layerId}`);

      if (!rasterImage && layer.nodeValue && `${layer.nodeValue}`.includes('\n')) {
        continue;
      }

      if (!rasterImage) {
        rasterImage = layer;
      }

      const xlinkHref = (rasterImage as Element)?.getAttribute('xlink:href');
      const pathData = (rasterImage as Element)?.getAttribute('d');
      const layerName = (layer as Element)?.getAttribute('data-name')?.split('-')[0] || '';
      if (
        !xlinkHref &&
        !pathData &&
        groupName.toLowerCase() !== 'size' &&
        groupName.toLowerCase() !== 'color'
      ) {
        continue;
      }

      const outputPath = `${outputFolder}/images/${group.id}_${layerId}`;
      let rawOutputPath = '';
      const thumbOutputPath = `${outputFolder}/images/thumb_${group.id}_${layerId}.webp`;
      const cropPath = `${outputFolder}/images/crop_${group.id}_${layerId}.webp`;
      let base64Data,
        imageFormat,
        width,
        height,
        x = 0,
        y = 0;

      if (pathData) {
        rawOutputPath = `${outputFolder}/images/raw_${group.id}_${layerId}`;
        const [itemSvgString, svgWidth, svgHeight, svgX, svgY] = itemSvgStringFromPath(
          pathData,
          viewBox,
          outputPath,
          rawOutputPath,
        );
        base64Data = itemSvgString;
        imageFormat = 'svg+xml';
        width = svgWidth;
        height = svgHeight;
        x = svgX;
        y = svgY;

        if (backgroundTranslateX !== Infinity) x += backgroundTranslateX;
        if (backgroundTranslateY !== Infinity) y += backgroundTranslateY;
      } else if (xlinkHref) {
        base64Data = xlinkHref;

        if (typeof base64Data === 'string') {
          imageFormat = 'png';
        } else {
          imageFormat = (base64Data.match(/^data:image\/(\w+);base64,/) || [])[1];
        }
        const rect = rasterImage?.getBoundingClientRect();
        width = rasterImage?.getAttribute('width');
        y = rect?.y || 0;
        x = rect?.x || 0;
        height = rasterImage?.getAttribute('height');

        if (layerId.toLocaleLowerCase().includes('background')) {
          backgroundTranslateX = Math.min(backgroundTranslateX, x);
          backgroundTranslateY = Math.min(backgroundTranslateY, y);
        }
      }

      const classOfLayer = layer.attrs;
      const classArray = [...classOfLayer];
      // const classes = classArray.find(attr => attr.nodeName === 'class');
      const styles = classArray.find(attr => attr.nodeName === 'style');

      if (styles && styles.nodeValue) {
        styleObj = convertStyleInlineCssToObject(styles.nodeValue);
      }

      // const classStyleObj =
      //   style && style.childNodes[0] ? convertStringCssToObject(style.childNodes[0].data) : null;
      const transforms = classArray.find(attr => attr.nodeName === 'transform');
      let scaleX = 1,
        skewY = 0,
        skewX = 0,
        scaleY = 1,
        translateX = 0,
        translateY = 0,
        rotate = 0;
      if (transforms && transforms.nodeValue) {
        if (transforms.nodeValue.includes('matrix')) {
          [scaleX, skewY, skewX, scaleY, translateX, translateY] = parseStringMatrix(
            transforms.nodeValue,
          );
        } else {
          [scaleX, skewY, skewX, scaleY, translateX, translateY, rotate] = parseStringTransform(
            transforms.nodeValue,
          );
        }
      }

      if (groupName.toLowerCase().includes('color')) {
        const fill_color = styleObj!['fill'] || '#FF0000';
        const width = 100;
        const height = 100;
        // createImagePromises.push(
        createImagePromises.push(
          createColorImage(outputPath, thumbOutputPath, fill_color, width, height),
        ),
          // );
          children.unshift({
            name: layerName || layerId,
            visible: false,
            opacity: 255,
            blend_mode: 'NORMAL',
            kind: 'pixel',
            width: Number(width),
            height: Number(height),
            x: 0,
            y: 0,
            children: null,
            is_group: false,
            image_path: `${outputPath}.png`,
            crop_image_path: thumbOutputPath,
            text_data: null,
            raw_image_path: `${outputPath}.png`,
            z_index: 0,
            thumb_image_path: thumbOutputPath,
            fill_color: fill_color,
            layerId: 'unknown',
          });
      } else if (groupName.toLowerCase() === 'size') {
        createImagePromises.push(createImageText(outputPath, thumbOutputPath, cropPath, layerName));
        const imagePathExtension = 'png';
        children.unshift({
          name: layerName || layerId,
          visible: false,
          opacity: 255,
          blend_mode: 'NORMAL',
          kind: 'pixel',
          width: Number(width),
          height: Number(height),
          x: x,
          y: y,
          children: null,
          is_group: false,
          image_path: imagePathExtension ? `${outputPath}.${imagePathExtension}` : '',
          crop_image_path: null,
          text_data: null,
          raw_image_path: imagePathExtension ? `${outputPath}.${imagePathExtension}` : '',
          z_index: zIndex,
          thumb_image_path: thumbOutputPath,
          // crop_image_path: cropPath,
          layerId: 'unknown',
        });
      } else {
        createImagePromises.push(
          createImageAndThumbnail(
            base64Data,
            outputPath,
            thumbOutputPath,
            imageFormat,
            filePath,
            cropPath,
          ),
        );
        const imagePathExtension =
          imageFormat?.replace('jpeg', 'jpg')?.replace('svg+xml', 'png') || '';
        children.unshift({
          name: layerName || layerId,
          visible: false,
          opacity: 255,
          blend_mode: 'NORMAL',
          kind: 'pixel',
          width: Number(width),
          height: Number(height),
          x: x,
          y: y,
          children: null,
          is_group: false,
          image_path: imagePathExtension ? `${outputPath}.${imagePathExtension}` : '',
          text_data: null,
          raw_image_path: imagePathExtension ? `${outputPath}.${imagePathExtension}` : '',
          z_index: zIndex,
          svg_path: rawOutputPath ? `${rawOutputPath}.svg` : null,
          crop_image_path: cropPath,
          thumb_image_path: thumbOutputPath,
          scaleX: scaleX ? Number(scaleX) : null,
          skewY: skewY ? Number(skewY) : null,
          skewX: skewX ? Number(skewX) : null,
          scaleY: scaleY ? Number(scaleY) : null,
          translateX: translateX ? Number(translateX) : 0,
          translateY: translateY ? Number(translateY) : 0,
          rotate: rotate ? Number(rotate) : null,
          layerId: 'unknown',
        });
      }
    }

    if (groupName.toLowerCase().includes('text') && !groupName.toLowerCase().includes('x2a_path')) {
      const texts = group.querySelectorAll('text');
      for (const textElement of texts) {
        const layerId = textElement.id || randomString(8);
        const layerName = textElement?.getAttribute('data-name')?.split('-')[0] || '';

        const classOfLayer = textElement.attrs;
        const classArray = [...classOfLayer];
        const classes = classArray.find(attr => attr.nodeName === 'class');
        const styles = classArray.find(attr => attr.nodeName === 'style');

        if (styles && styles.nodeValue) {
          styleObj = convertStyleInlineCssToObject(styles.nodeValue);
        }

        const classStyleObj =
          style && style.childNodes[0] ? convertStringCssToObject(style.childNodes[0].data) : null;
        const transforms = classArray.find(attr => attr.nodeName === 'transform');
        const x = 0,
          y = 0;
        let scaleX = 1,
          skewY = 0,
          skewX = 0,
          scaleY = 1,
          translateX = 0,
          translateY = 0,
          rotate = 0;
        if (transforms && transforms.nodeValue) {
          if (transforms.nodeValue.includes('matrix')) {
            [scaleX, skewY, skewX, scaleY, translateX, translateY] = parseStringMatrix(
              transforms.nodeValue,
            );
          } else {
            [scaleX, skewY, skewX, scaleY, translateX, translateY, rotate] = parseStringTransform(
              transforms.nodeValue,
            );
          }
        }

        let fill_color = styleObj?.['fill'] || 'black';
        let font_size = Number(
          (styleObj?.['fontSize'] || styleObj?.['font-size'] || '27')?.replace('px', ''),
        );
        let font_name = styleObj?.['fontFamily'] || styleObj?.['font-family'] || 'Arial';
        let stroke_color = styleObj?.['stroke'] || null;
        let stroke_width = Number(styleObj?.['stroke-width']?.replace('px', '') || 0);

        const classesOfElements = classes?.nodeValue?.split(' ') || [];
        for (const c of classesOfElements) {
          if (classStyleObj && classStyleObj[c]) {
            if (classStyleObj[c]['fill']) {
              fill_color = classStyleObj[c]['fill'];
            }
            if (classStyleObj[c]['fontSize'] || classStyleObj[c]['font-size']) {
              font_size = Number(
                (classStyleObj[c]['fontSize'] || classStyleObj[c]['font-size']).replace('px', ''),
              );
            }
            if (classStyleObj[c]['fontFamily'] || classStyleObj[c]['font-family']) {
              font_name = classStyleObj[c]['fontFamily'] || classStyleObj[c]['font-family'];
            }
            if (classStyleObj[c]['stroke']) {
              stroke_color = classStyleObj[c]['stroke'];
            }
            if (classStyleObj[c]['stroke']) {
              stroke_color = classStyleObj[c]['stroke'];
            }
            if (classStyleObj[c]['strokeWidth'] || classStyleObj[c]['stroke-width']) {
              stroke_width = Number(classStyleObj[c]['stroke-width'].replace('px', ''));
            }
          }
        }

        const textValue = textElement?.childNodes
          .map(node => node?.nodeValue || node?.childNodes?.[0]?.nodeValue || '')
          .join('')
          .trim();
        const widthOfText = font_size * (textValue.length || 10) * 0.52;
        const heightOfText = font_size * 1.5;
        children.unshift({
          name: layerName || layerId,
          visible: true,
          opacity: 255,
          blend_mode: 'NORMAL',
          kind: 'type',
          width: Number(widthOfText),
          height: Number(heightOfText),
          x: x + translateX,
          y: y + translateY,
          children: null,
          is_group: false,
          image_path: null,
          text_data: {
            fill_color: fill_color || '#FFF',
            stroke_color: stroke_color,
            stroke_width: stroke_width,
            font_size: font_size || '27',
            text: textValue || randomString(5),
            font_path: null,
            font_name: font_name || 'Arial',
          },
          raw_image_path: null,
          z_index: null,
          svg_path: null,
          thumb_image_path: null,
          scaleX: scaleX ? Number(scaleX) : null,
          skewY: skewY ? Number(skewY) : null,
          skewX: skewX ? Number(skewX) : null,
          scaleY: scaleY ? Number(scaleY) : null,
          translateX: translateX,
          translateY: translateY,
          rotate: rotate ? Number(rotate) : null,
        });
      }
    }

    if (groupName.toLowerCase().includes('x2a_path')) {
      const pathElement = group.querySelector('path');
      const textElement = group.querySelector('text');
      const tspanElement = group.querySelector('tspan');

      const font_size: any = tspanElement?.style.fontSize.replace('px', '');
      const fill_color = pathElement?.style.fill == 'none' ? '#000000' : pathElement?.style.fill;

      const rect = textElement?.getBoundingClientRect();
      // const width = textElement?.getAttribute('width');
      const y = rect?.y || 0;
      const x = rect?.x || 0;
      // const height = textElement?.getAttribute('height');
      const widthOfText = Number(font_size) * (tspanElement?.textContent?.length || 5) * 0.8;
      const heightOfText = Number(font_size) * 1.5;

      const stroke_color = tspanElement!.style.stroke || '#000000';
      const stroke_width = tspanElement!.style.strokeWidth || 0;
      // const scaleX = 1,
      //   skewY = 0,
      //   skewX = 0,
      //   scaleY = 1,
      //   translateX = 0,
      //   translateY = 0,
      const rotate = tspanElement!.rotate || 0;

      children.unshift({
        name: randomString(8),
        visible: true,
        opacity: 255,
        blend_mode: 'NORMAL',
        kind: 'textpath',
        width: Number(widthOfText),
        height: Number(heightOfText),
        x: x,
        y: y - (font_size * 0.5 || 0),
        children: null,
        is_group: false,
        image_path: null,
        text_data: {
          fill_color: fill_color,
          stroke_color: stroke_color,
          stroke_width: stroke_width,
          font_size: font_size || '100',
          text: tspanElement?.textContent || randomString(5),
          font_path: null,
          font_name: tspanElement?.style.fontFamily || 'Arial',
          text_path: pathElement?.getAttribute('d'),
        },
        raw_image_path: null,
        z_index: null,
        svg_path: null,
        thumb_image_path: null,
        // "scaleX": scaleX ? Number(scaleX) : null,
        // "skewY": skewY ? Number(skewY) : null,
        // "skewX": skewX ? Number(skewX) : null,
        // "scaleY": scaleY ? Number(scaleY) : null,
        translateX: 0,
        translateY: 0,
        rotate: rotate ? Number(rotate) : null,
      });
    }

    let layerName = groupName || group.id;
    const groupIdLowerCase = `${layerName}`.toLocaleLowerCase();
    if (
      !groupIdLowerCase.includes('text') &&
      !groupIdLowerCase.includes('background') &&
      !groupIdLowerCase.includes('choose')
    ) {
      layerName = `Choose ${layerName}`;
    }
    layers.push({
      name: layerName,
      visible: true,
      opacity: 255,
      blend_mode: 'NORMAL',
      kind: 'pixel',
      width: group.getBBox().width,
      height: group.getBBox().height,
      x: 0,
      y: 0,
      children: children.length > 0 ? children : null,
      is_group: children.length > 0,
      image_path: null,
      text_data: null,
      raw_image_path: null,
      z_index: zIndex,
      crop_image_path: null,
      thumb_image_path: null,
      layerId: 'unknown',
    });
  }

  await Promise.all(createImagePromises);
  translateToPositivePosition(layers);
  setWidthAndHeight(layers);
  return await saveToJson(layers, filePath, outputFolder);
};

const translateToPositivePosition = layers => {
  let minX = 0;
  let minY = 0;

  layers.forEach(layer => {
    if (!layer.children) return;

    layer.children.forEach(child => {
      minX = Math.min(child.x, minX);
      minY = Math.min(child.y, minY);
    });
  });

  if (minX >= 0 && minY >= 0) return;

  layers.forEach(layer => {
    if (!layer.children) return;

    layer.children.forEach(child => {
      child.x = child.x - minX;
      child.y = child.y - minY;
    });
  });
};

const setWidthAndHeight = layers => {
  const backgroundLayer = layers.find(layer => layer.name === 'Background');
  const chooseColorLayer = layers.find(layer => layer.name === 'Choose Color');
  let maxWidth = 0;
  let maxHeight = 0;
  let minX = Infinity;
  let minY = Infinity;

  if (backgroundLayer && backgroundLayer.children) {
    backgroundLayer.children.forEach(layer => {
      maxWidth = Math.max(layer.width * (layer.scaleX || 1), maxWidth);
      maxHeight = Math.max(layer.height * (layer.scaleY || 1), maxHeight);
      minX = Math.min(minX, layer.x);
      minY = Math.min(minY, layer.y);
    });
  }

  if (chooseColorLayer && chooseColorLayer.children) {
    chooseColorLayer.children.forEach(layer => {
      (layer.x = minX), (layer.y = minY), (layer.scaleX = maxWidth / layer.width);
      layer.scaleY = maxHeight / layer.height;
    });
  }

  layers.width = maxWidth;
  layers.height = maxHeight;
};

const checkOutputFolder = async outputFolder => {
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

async function processSvg(filePath, outputFolder) {
  await checkOutputFolder(outputFolder);
  const psdData = await extractSvg(filePath, outputFolder);
  return psdData;
}

function randomString(length = 5) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export {handleProcessSvg};
