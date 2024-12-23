const convertBitToBoolean = (bitField) => {
  if (bitField === null || bitField === undefined) return false;
  return Buffer.isBuffer(bitField)
    ? bitField.readInt8(0) === 1
    : Boolean(bitField);
};
module.exports = convertBitToBoolean;
