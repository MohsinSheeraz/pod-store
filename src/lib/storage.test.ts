import { test } from "node:test";
import assert from "node:assert/strict";
import { signRequest, storageMode } from "@/lib/storage";

// AWS's own worked example for Signature Version 4 ("GET Object" with a Range header):
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
test("signRequest reproduces the signature in AWS's documentation", () => {
  const auth = signRequest({
    method: "GET",
    host: "examplebucket.s3.amazonaws.com",
    path: "/test.txt",
    headers: {
      range: "bytes=0-9",
      "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "x-amz-date": "20130524T000000Z",
    },
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    amzDate: "20130524T000000Z",
  });
  assert.match(auth, /Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/us-east-1\/s3\/aws4_request/);
  assert.match(auth, /SignedHeaders=host;range;x-amz-content-sha256;x-amz-date/);
  assert.match(auth, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41/);
});

test("storage is S3 when a bucket is configured, local in development, the database in production", () => {
  const bucket = { S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" };
  assert.equal(storageMode({ ...bucket, NODE_ENV: "production" }), "s3");
  assert.equal(storageMode({ ...bucket, NODE_ENV: "development" }), "s3");
  assert.equal(storageMode({ NODE_ENV: "development" }), "local");
  // Never fall back to the server's disk in production: files would vanish on redeploy.
  assert.equal(storageMode({ NODE_ENV: "production" }), "database");
  assert.equal(storageMode({ NODE_ENV: "production", S3_BUCKET: "b" }), "database");
});
