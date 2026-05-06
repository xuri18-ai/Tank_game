# 卡通坦克大战

这是一个纯前端 Canvas 坦克大战小游戏，入口文件是 `index.html`，不需要安装依赖或构建工具。

## 如果你直接在 GitHub 上看项目，怎么打开游戏界面？

GitHub 的代码页面不能直接运行 Canvas 游戏。你需要选择下面任意一种方式：

### 方式一：用 GitHub Pages 在线打开（推荐给只有 GitHub 的情况）

1. 打开 GitHub 仓库页面。
2. 进入 **Settings**。
3. 在左侧菜单找到 **Pages**。
4. 在 **Build and deployment** 里选择：
   - **Source**：`Deploy from a branch`
   - **Branch**：选择当前分支，例如 `main` 或你的开发分支
   - **Folder**：选择 `/ (root)`
5. 点击 **Save**。
6. 等待 GitHub Pages 部署完成后，页面会显示一个网址，通常类似：

   ```text
   https://你的用户名.github.io/仓库名/
   ```

7. 打开这个网址，就能看到游戏界面。

> 注意：GitHub Pages 第一次部署通常需要等待几十秒到几分钟。

### 方式二：下载项目后用浏览器打开

1. 在 GitHub 仓库页面点击绿色 **Code** 按钮。
2. 点击 **Download ZIP**。
3. 解压下载的 ZIP 文件。
4. 双击解压目录里的 `index.html`。

### 方式三：下载项目后用本地服务器打开

如果你电脑上有 Python，可以在解压后的项目目录里运行：

```bash
python3 -m http.server 4173
```

然后用浏览器打开：

```text
http://127.0.0.1:4173/
```

## 游戏操作

- `WASD` 或方向键：移动与瞄准
- 空格：发射炮弹
- Enter：开始或重新开始
