const fs = require("fs");
const path = require("path");

const cleanText = (inputText) => {
    return inputText
}

const base64ToPng = async (base64String, outputPath) => {
    if (!base64String || !outputPath) {
      console.error("it is neccesary base64String and outputPath");
      return;
    }
  
    const srcFolderPath = path.join(__dirname, "..", "..");
    const qrFolderPath = path.join(srcFolderPath, "img");
    const fullOutputPath = path.join(qrFolderPath, outputPath);
  
    const data = base64String.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, "base64");
  
    if (!fs.existsSync(path.join(srcFolderPath, "img"))) {
      fs.mkdirSync(path.join(srcFolderPath, "img"), { recursive: true });
    }
    if (!fs.existsSync(path.join(qrFolderPath, "qr"))) {
      fs.mkdirSync(path.join(qrFolderPath, "qr"), { recursive: true });
    }
  
    fs.writeFileSync(fullOutputPath, buffer);
};

module.exports = { cleanText, base64ToPng }
