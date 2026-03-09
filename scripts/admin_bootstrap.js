const db = require('./database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- 管理員權限設置工具 ---');
rl.question('請輸入要設置為管理員的 Email: ', (email) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user) {
    console.log('找不到該用戶，請先在前台註冊帳號後再運行此腳本。');
    rl.close();
    return;
  }
  
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(email);
  console.log(`成功！用戶 ${email} 已設置為管理員（admin）。`);
  console.log('您現在可以登入並訪問管理後台了。');
  rl.close();
});
