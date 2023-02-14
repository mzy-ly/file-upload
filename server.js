const express = require("express");
const bodyParser = require("body-parser");
let multer = require('multer');
let fs = require('fs');
let path = require('path');
const { readDefaultFile, mkdirsSync } = require("./utils");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const uploadPath = path.join(__dirname, 'uploads');
const uploadTempPath = path.join(uploadPath, 'temp');
const sliceUpload = multer({
    dest: uploadTempPath
});

const artTemplate = require("art-template");
app.engine('html', artTemplate);
artTemplate.defaults.cache = true;
artTemplate.defaults.minimize = true;
artTemplate.defaults.htmlMinifierOptions = {
    collapseWhitespace: true,
    minifyCSS: true,
    minifyJS: true,
    // 运行时自动合并：rules.map(rule => rule.test)
    ignoreCustomFragments: [],
    includeAutoGeneratedTags: false // cnm
}
/**
 * 编译页面内容
 * @param {*} page 页面模版
 * @param {*} data 页面数据
 * @returns
 */
function renderPageContent(page, data) {
    return artTemplate.render(readDefaultFile(`./public/template/${page}`), data);
}
app.use("/assets", express.static("public/assets"));

const {
    createHash
} = require('crypto');
/**
 * @param {string} algorithm
 * @param {any} content
 *  @return {string}
 */
const encrypt = (algorithm, content) => {
    return createHash(algorithm).update(content).digest('hex');
}
/**
 * @param {any} content
 *  @return {string}
 */
const md5 = (content) => encrypt('md5', content)

// 工具-上传视频
app.get("/uploadVideo", function (req, res) {
    res.end(renderPageContent('upload_video.html'));
})
let upload = multer({
    storage: multer.diskStorage({
        //设置文件存储位置
        destination: function (req, file, cb) {
            let dir = "./uploads/";

            //判断目录是否存在，没有则创建
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {
                    recursive: true
                });
            }

            //dir就是上传文件存放的目录
            cb(null, dir);
        },
        //设置文件名称
        filename: function (req, file, cb) {
            let fileName = file.originalname;
            //fileName就是上传文件的文件名
            cb(null, fileName);
        }
    })
});

// api 上传小文件
app.post('/upload', upload.single('file'), (req, res) => {
    console.log(444, req)
    const { filename } = req.file
    const filePath = path.join(uploadPath, filename)
    return res.json({
      code: 0,
      data: {
        ...req.file,
        url: filePath
      },
      message: '上传成功'
    })
})

/**————————————————————————————————————————————————————————————————————————————
 * single(fieldname)
 * Accept a single file with the name fieldname. The single file will be stored in req.file.
 */
app.post('/file/upload', sliceUpload.single('file'), (req, res) => {
    console.log('file upload...', req.body)
    // 根据文件hash创建文件夹，把默认上传的文件移动当前hash文件夹下。方便后续文件合并。
    const {
        name,
        index,
        hash
    } = req.body;

    const chunksPath = path.join(uploadPath, hash, '/');
    if (!fs.existsSync(chunksPath)) mkdirsSync(chunksPath);
    fs.renameSync(req.file.path, chunksPath + hash + '-' + index);
    return res.json({
        code: 0,
        data: {
            ...req.file
        },
        message: `第${index+1}个切片上传成功`
    })
})

app.post('/file/merge_chunks', (req, res) => {
    console.log(11111, req.body)
    const {
        name,
        total,
        hash
    } = req.body;
    // 根据hash值，获取分片文件。
    // 创建存储文件
    // 合并
    const chunksPath = path.join(uploadPath, hash, '/');
    const filePath = path.join(uploadPath, name);
    // 读取所有的chunks 文件名存放在数组中
    const chunks = fs.readdirSync(chunksPath);
    // 创建存储文件
    fs.writeFileSync(filePath, '');
    if (chunks.length !== total || chunks.length === 0) {
        // ctx.status = 200;
        res.end({
            message: '切片文件数量不符合'
        });
        return;
    }
    for (let i = 0; i < total; i++) {
        // 追加写入到文件中
        fs.appendFileSync(filePath, fs.readFileSync(chunksPath + hash + '-' + i));
        // 删除本次使用的chunk    
        fs.unlinkSync(chunksPath + hash + '-' + i);
    }
    fs.rmdirSync(chunksPath);
    // 文件合并成功，可以把文件信息进行入库。
    return res.json({
        code: 0,
        data: {
            name,
            total,
            hash,
            url: filePath
        },
        message: '全部上传成功'
    })
})


module.exports = app;