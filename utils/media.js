// Instagram allowed formats :
//      - Images : .jpeg and .png
//      - Videos : .mp4 and .mov

const PNGMagicNumber = '89504e47';
const JPEGMagicNumber = 'ffd8ff';
const GIFMagicNumber = '47494638';

const PNGMNBytesLength = 4;
const JPEGMNBytesLength = 3;
const GIFMNBytesLength = 4;

const isPNG = (bytes) => bytes === PNGMagicNumber;
const isJPEG = (bytes) => bytes === JPEGMagicNumber;
const isGIF = (bytes) => bytes === GIFMagicNumber;

module.exports = {
    isJPEG,
    isPNG,
    isGIF
}