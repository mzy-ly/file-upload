const request = require("request");
const { readFileSync, writeFileSync } = require("fs");
const CACHE_TIME = 3000;
/**
 * 模拟 curl
 */
const curl = (option) =>
  new Promise((resolve, reject) => {
    request(option, (err, response, body) => {
      if (err) reject(err);
      resolve(body);
    });
  });
/**
 * 序列化登录态中的用户信息
 */
 function serializeUserData(data) {
  let result = {};
  if (!data) return result;
  try {
    result.profile = JSON.parse(data.profile);
    result.token = data.token;
  } catch (e) {
    result.profile = {};
    result.token = "";
  }
  return result;
}

const now = () => new Date() - 0;
const isExpired = (expires) => expires < now();
const addExpires = (delta) => {
  if(delta) return now() + (delta*1000);
  return now() + CACHE_TIME;
};
const readDefaultFile = (path) => readFileSync(path, { encoding: "utf8" });

const readDataFile = (path) => readFileSync(path, { encoding: "utf8" });

const saveDataFile = (path,data) => writeFileSync(path, data, { encoding: "utf8" });


/**
 * 禁用缓存
 */
function nocache(req, res, next) {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
}


module.exports = {
  curl,
  now,
  isExpired,
  addExpires,
  readDataFile,
  readDefaultFile,
  saveDataFile,
  nocache,serializeUserData
};
