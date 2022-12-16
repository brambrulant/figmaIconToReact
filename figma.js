const axios = require("axios").default;
const fs = require("fs");

const baseUrl = "https://api.figma.com/v1";
const personalAccessToken = "figd_JJNLyyQLD9jPmz0wZRinliCRNxjfrvIp2xQlfB-H";
const url = process.argv[2];
const fileName = process.argv[3];

// create a regex that matches everything after "note-id="
const regexNodeId = /node-id=(.*)/;

// create a regex that matches everything after "file/" until "/"
const regexFileKey = /file\/(.*)\//;

const getNodeId = (url) => {
  const match = url.match(regexNodeId);
  return match[1];
};

const getFileKey = (url) => {
  const match = url.match(regexFileKey);
  return match[1];
};

const getImageURL = async () => {
  const noteId = await getNodeId(url);
  const fileKey = await getFileKey(url);

  try {
    const response = await axios.get(
      `${baseUrl}/images/${fileKey}?ids=${noteId}&format=svg`,
      {
        headers: {
          "X-FIGMA-TOKEN": personalAccessToken,
        },
      }
    );
    const images = response.data.images;
    const imageUrl = Object.values(images)[0];
    return imageUrl;
  } catch (err) {
    console.log("error", err.response);
    return;
  }
};

const getNodeName = async () => {
  const noteId = await getNodeId(url);
  const fileKey = await getFileKey(url);
  try {
    const response = await axios.get(
      `${baseUrl}/files/${fileKey}/nodes?ids=${noteId}`,
      {
        headers: {
          "X-FIGMA-TOKEN": personalAccessToken,
        },
      }
    );
    const nodes = response.data.nodes;
    const nodeName = Object.values(nodes)[0].document.name;
    return nodeName;
  } catch (err) {
    console.log("error", err.response.status);
  }
};

const downloadImage = async (iconName) => {
  console.log("name", iconName);
  const imageUrl = await getImageURL();
  const writer = fs.createWriteStream(`${iconName}.svg`);
  const response = await axios({
    url: imageUrl,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

// create function that gets svg data from a file
const getSvgData = async () => {
  const iconName = await getNodeName(getNodeId(url));

  await downloadImage(iconName);
  const svgData = await fs.readFileSync(`${iconName}.svg`, "utf8");

  // regex that replaces <svg with <SvgIcon
  const regexSvgIcon = /<svg/g;

  // regex that replaces </svg with </SvgIcon
  const regexSvgIconEnd = /<\/svg/g;

  const svgDataWithSvgIcon = svgData.replace(regexSvgIcon, "<SvgIcon");
  const svgDataWithSvgIconEnd = svgDataWithSvgIcon.replace(
    regexSvgIconEnd,
    "</SvgIcon"
  );

  return svgDataWithSvgIconEnd;
};

const createReactComponent = async () => {
  const svgData = await getSvgData();
  let iconName
  fileName ? iconName = fileName : iconName = await getNodeName(getNodeId(url));

  const tsxFile = `import React from "react";
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon'

const ${iconName}: React.FC<Exclude<SvgIconProps, 'viewBox'>> = (props) => (
  ${svgData}
)

export default ${iconName}
`;
  fs.writeFileSync(`${iconName}.tsx`, tsxFile, "utf8");
};

createReactComponent();
