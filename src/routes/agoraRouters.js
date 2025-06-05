import express from "express";
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

const router = express.Router();

const noCache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};

const generateAccessToken = (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  const { channelName } = req.body;
  if (!channelName) {
    return res
      .status(500)
      .json({ success: false, error: "Channel Name is required..!!" });
  }
  let uid = req.body.uid;
  if (!uid || uid == "") {
    uid = 0;
  }
  let role = RtcRole.SUBSCRIBER;
  if (req.body.role == "publisher") {
    role = RtcRole.PUBLISHER;
  }
  let expireTime = req.body.expireTime;
  if (!expireTime || expireTime == "") {
    expireTime = 3600;
  } else {
    expireTime = parseInt(expireTime, 10);
  }
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;
  const token = RtcTokenBuilder.buildTokenWithUid(
    process.env.APP_ID,
    process.env.APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpireTime
  );
  return res.status(200).json({ success: true, token: token });
};

router.post("/api/getRtcAccessToken", noCache, generateAccessToken);

export default router;
