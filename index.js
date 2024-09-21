const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register("cloudflare-r2", {
      handle,
      name: "Cloudflare R2",
      config: config,
    });
  };

  const handle = async (ctx) => {
    const userConfig = ctx.getConfig("picBed.cloudflare-r2");
    if (!userConfig) {
      throw new Error("未找到上传器配置");
    }

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${userConfig.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: userConfig.accessKeyId,
        secretAccessKey: userConfig.secretAccessKey,
      },
    });

    try {
      const uploadPromises = ctx.output.map(async (image) => {
        const key = `${userConfig.path || ""}${image.fileName}`;
        const command = new PutObjectCommand({
          Bucket: userConfig.bucket,
          Key: key,
          Body: image.buffer,
          ContentType: image.extname,
        });

        await client.send(command);
        image.imgUrl = `https://${userConfig.customDomain}/${key}`;
        return image;
      });

      await Promise.all(uploadPromises);
    } catch (err) {
      ctx.emit("notification", {
        title: "上传失败",
        body: err.message,
      });
      throw err;
    }

    return ctx;
  };

  const config = (ctx) => {
    let userConfig = ctx.getConfig("picBed.cloudflare-r2") || {};
    return [
      {
        name: "accountId",
        type: "input",
        default: userConfig.accountId || "",
        required: true,
        message: "Cloudflare Account ID",
        alias: "Account ID",
      },
      {
        name: "accessKeyId",
        type: "input",
        default: userConfig.accessKeyId || "",
        required: true,
        message: "AccessKey ID",
        alias: "AccessKey ID",
      },
      {
        name: "secretAccessKey",
        type: "password",
        default: userConfig.secretAccessKey || "",
        required: true,
        message: "SecretAccessKey",
        alias: "SecretAccessKey",
      },
      {
        name: "bucket",
        type: "input",
        default: userConfig.bucket || "",
        required: true,
        message: "Bucket name",
        alias: "存储桶名称",
      },
      {
        name: "path",
        type: "input",
        default: userConfig.path || "",
        required: false,
        message: "Storage path (optional)",
        alias: "存储路径(可选)",
      },
      {
        name: "customDomain",
        type: "input",
        default: userConfig.customDomain || "",
        required: true,
        message: "Custom domain",
        alias: "自定义域名",
      },
    ];
  };

  return {
    uploader: "cloudflare-r2",
    register,
  };
};
