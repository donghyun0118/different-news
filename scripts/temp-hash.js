// scripts/temp-hash.js
import bcrypt from "bcrypt";

const plain = process.argv[2];
if (!plain) {
  console.error("비밀번호를 인자로 넘겨주세요. 예: node scripts/temp-hash.js mySecret!");
  process.exit(1);
}

const hash = await bcrypt.hash(plain, 10);
console.log(hash);
