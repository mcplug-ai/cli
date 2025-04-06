const crypto = require("crypto");

async function generateSecret() {
  return `mcplug_${crypto.randomBytes(32).toString("hex")}`;
}

module.exports = {
  generateSecret
};
