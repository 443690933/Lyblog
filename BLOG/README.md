# my-learning-blog

一个极简、干净、适合长期维护的个人学习记录网站。项目使用原生 HTML、CSS、JavaScript 编写，不依赖框架、不使用 npm、不需要后端和数据库，可以直接部署到 GitHub Pages。

网站现在支持两种文章来源：

- 静态文章：写在 `data/articles.json` + `posts/*.md` 中，提交到 GitHub 后所有人可见。
- 本地文章：在 `admin.html` 页面中新增、编辑、删除，保存到当前浏览器 `localStorage` 中，只对当前浏览器可见。

关于页 `about.html` 仍然支持在页面上点击“编辑本页”进行本地编辑，编辑内容保存到当前浏览器的 `localStorage`。

## 项目结构

```text
my-learning-blog/
├── index.html
├── article.html
├── admin.html
├── about.html
├── style.css
├── script.js
├── README.md
├── data/
│   ├── articles.json
│   └── about.json
└── posts/
    └── README.md
```

## 本地运行

由于首页和详情页需要通过 `fetch` 读取 JSON / Markdown 文件，建议在项目目录启动一个本地静态服务器。

如果电脑有 Python，可以在项目目录运行：

```bash
python -m http.server 8000
```

如果 Windows 上 `python` 不可用，可以尝试：

```bash
py -m http.server 8000
```

然后打开：

```text
http://localhost:8000/index.html
```

## 添加公开文章

公开文章会随仓库一起部署，别人打开你的 GitHub Pages 网站时也能看到。

```text
1. 在 posts/ 中新建 Markdown 文件
2. 在 data/articles.json 中登记文章信息
3. 提交到 GitHub
4. GitHub Pages 自动更新
```

在 `posts/` 目录中新建一个 Markdown 文件，例如：

```text
posts/article-001.md
```

Markdown 示例：

```markdown
# 文章标题

## 学习内容

这里写正文。

## 今日收获

这里写总结。
```

然后在 `data/articles.json` 中登记：

```json
[
  {
    "id": "article-001",
    "title": "文章标题",
    "date": "2026-06-29",
    "category": "AI",
    "summary": "这里写文章摘要",
    "file": "posts/article-001.md",
    "link": ""
  }
]
```

字段说明：

- `id`：文章唯一标识，会用于详情页 URL。
- `title`：文章标题。
- `date`：文章日期，首页会按日期倒序展示。
- `category`：文章分类，首页会自动提取分类筛选项。
- `summary`：文章摘要。
- `file`：Markdown 正文路径。
- `link`：外部链接，可为空。

## 添加本地文章

本地文章适合做个人草稿、临时学习笔记或只想在当前浏览器查看的内容。

```text
1. 打开 admin.html
2. 填写标题、日期、分类、摘要、正文
3. 点击保存文章
4. 首页自动显示
```

本地文章保存到：

```javascript
localStorage["learning_blog_local_articles"]
```

数据格式大致如下：

```json
[
  {
    "id": "local-时间戳",
    "title": "文章标题",
    "date": "2026-06-29",
    "category": "分类",
    "summary": "文章摘要",
    "content": "# Markdown 正文标题\n\n这里写正文内容。",
    "link": "https://example.com",
    "source": "local",
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
]
```

本地文章正文直接保存在 `content` 字段中，使用 Markdown 文本，不会生成 `posts/*.md` 文件。

## 如何把本地文章发布为公开文章

本地文章只保存在当前浏览器 `localStorage`。如果只是自己记录，可以继续使用本地文章；如果想让别人也看到，就需要导出为公开文章，并提交到 GitHub。

操作流程：

```text
1. 打开 admin.html
2. 在本地文章列表中点击“导出公开”
3. 复制生成的 Markdown 文件名
4. 在 posts/ 目录中新建对应 Markdown 文件
5. 复制生成的 Markdown 内容并保存到该文件
6. 复制生成的 JSON 片段
7. 将 JSON 片段添加到 data/articles.json 数组中
8. 提交并推送到 GitHub
9. GitHub Pages 更新后所有人可见
```

导出功能不会自动写入仓库文件。它只生成方便复制的内容：

- Markdown 文件路径，例如 `posts/local-1719650000000.md`
- Markdown 正文内容
- 可添加到 `data/articles.json` 的文章 JSON 片段

## localStorage 限制

通过 `admin.html` 添加的本地文章只保存到当前浏览器 `localStorage`。

换电脑、换浏览器、清理缓存后可能丢失。

别人打开你的 GitHub Pages 网站时，看不到你本地新增的文章。

如果想让别人看到，需要把文章写成 Markdown 文件，并添加到 `data/articles.json` 后提交到 GitHub。

## 首页与详情页

首页会同时展示：

- 静态文章：来自 `data/articles.json` + `posts/*.md`
- 本地文章：来自当前浏览器 `localStorage`

文章列表会按日期倒序排列。搜索和分类筛选会同时作用于静态文章和本地文章。

详情页 URL 格式是：

```text
article.html?id=文章id
```

本地文章详情页会额外显示“编辑本文”按钮，点击后进入：

```text
admin.html?edit=文章id
```

## Markdown 支持

当前 Markdown 解析器支持：

- `#`、`##`、`###` 标题
- 普通段落
- `-` 无序列表
- `1.` 有序列表
- 行内代码
- 代码块
- `[文本](链接)` 链接

## 修改默认关于页

公开默认关于页内容位于：

```text
data/about.json
```

如果想让所有访问者都看到新的关于页内容，请直接修改 `data/about.json`，然后提交并推送到 GitHub。

## 页面内编辑 about

打开 `about.html`，点击“编辑本页”即可编辑：

- 页面标签
- 页面标题
- 页面简介
- 三个模块的标题和内容

点击“保存”后，内容会立即更新，并保存到当前浏览器 `localStorage`。刷新页面后仍会优先显示本地编辑内容。

about 本地编辑使用的 key 是：

```javascript
localStorage["learning_blog_about"]
```

如果换浏览器、换电脑或清理缓存，about 页面本地修改可能消失。

## 部署到 GitHub Pages

1. 创建 GitHub 仓库，例如 `my-learning-blog`。
2. 上传本项目所有文件。
3. 进入仓库 `Settings`。
4. 进入 `Pages`。
5. `Source` 选择 `Deploy from a branch`。
6. `Branch` 选择 `main`。
7. `Folder` 选择 `/root`。
8. 保存后等待部署完成。
9. 访问 `https://你的用户名.github.io/my-learning-blog/`。
