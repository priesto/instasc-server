// Instagram allowed formats :
//      - Images : .jpeg and .png
//      - Videos : .mp4 and .mov

const PNGMagicNumber = '89504e47';
const JPEGMagicNumber = 'ffd8ff';

const PNGMNBytesLength = 4;
const JPEGMNBytesLength = 3;

const isPNG = (bytes) => bytes === PNGMagicNumber;
const isJPEG = (bytes) => bytes === JPEGMagicNumber;

module.exports = {
    isJPEG,
    isPNG
}