import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLang } from "./fix-codeblock-lang.mjs";

test("detectLang: php", () => {
  assert.equal(detectLang("<?php\necho 1;"), "php");
});

test("detectLang: C via #include", () => {
  assert.equal(detectLang("#include <stdio.h>\nint main() { return 0; }"), "c");
});

test("detectLang: C via uint8_t", () => {
  assert.equal(detectLang("uint8_t geohashEstimateStepsByRadius(double r);"), "c");
});

test("detectLang: Java", () => {
  assert.equal(detectLang('String a = "abc";\nint price = 16;'), "java");
});

test("detectLang: SQL via mysql prompt", () => {
  assert.equal(detectLang("mysql> SHOW ENGINES;"), "sql");
});

test("detectLang: SQL via keywords", () => {
  assert.equal(detectLang("SELECT * FROM users WHERE id = 1;"), "sql");
});

test("detectLang: bash via prompt", () => {
  assert.equal(detectLang("$ sudo apt-get update"), "bash");
});

test("detectLang: bash via command lines", () => {
  assert.equal(detectLang("git clone https://example.com/repo.git\ncd repo\nnpm install"), "bash");
});

test("detectLang: typescript", () => {
  assert.equal(detectLang("interface Foo {\n  x: string\n}"), "typescript");
});

test("detectLang: javascript (no TS markers)", () => {
  assert.equal(detectLang("console.log('hello')"), "javascript");
});

test("detectLang: dockerfile", () => {
  assert.equal(detectLang("FROM node:16-alpine\nRUN npm install\nCMD [\"node\", \"server.js\"]"), "dockerfile");
});

test("detectLang: 注释多的 Dockerfile 仍命中（不误判为 javascript）", () => {
  const redisDockerfile = [
    "FROM debian:stretch-slim",
    "",
    "# add our user and group first",
    "RUN groupadd -r redis && useradd -r -g redis redis",
    "RUN apt-get update && apt-get install -y openssl",
    "ENV REDIS_VERSION 5.0.0",
    "CMD [\"redis-server\"]",
  ].join("\n");
  assert.equal(detectLang(redisDockerfile), "dockerfile");
});

test("detectLang: json", () => {
  assert.equal(detectLang('{\n  "name": "app",\n  "version": 1\n}'), "json");
});

test("detectLang: ini / env", () => {
  assert.equal(detectLang("DB_HOST=127.0.0.1\nDB_PORT=3306"), "ini");
});

test("detectLang: binary illustration -> text", () => {
  assert.equal(detectLang("'a' -> 00000001 (十六进制：0x01)"), "text");
});

test("detectLang: file tree -> text", () => {
  assert.equal(detectLang("├── app.js\n└── index.js"), "text");
});

test("detectLang: prose -> text", () => {
  assert.equal(detectLang("这是一段说明文字，不是代码"), "text");
});

test("detectLang: empty -> text", () => {
  assert.equal(detectLang(""), "text");
});

test("detectLang: 不把中文冒号的散文当 yaml", () => {
  assert.equal(detectLang("预留位1：0x00\n预留位2：0x01"), "text");
});
