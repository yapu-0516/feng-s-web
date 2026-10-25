# 字体来源与许可

页面使用两套本地 Noto 可变字体的站点子集，避免因访客设备缺少字体而改变排版。

| 用途 | 字体 | 项目文件 | 原字体 | 许可 |
|---|---|---|---|---|
| 正文、按钮、说明 | Noto Sans SC | `assets/fonts/noto-sans-sc-site.woff` | Noto Sans SC Variable | SIL Open Font License 1.1 |
| 标题、人物姓名、引言 | Noto Serif SC | `assets/fonts/noto-serif-sc-site.woff` | Noto Serif SC Variable | SIL Open Font License 1.1 |

两个文件使用 `pyftsubset` 生成，仅包含本页 HTML、脚本和样稿留言实际使用的字符。原始字体文件位于本机系统字体目录，未把未使用字形分发进项目。

许可全文：

- `assets/fonts/OFL.txt`
- `assets/fonts/OFL-NotoSerifSC.txt`

官方来源：

- https://github.com/google/fonts/tree/main/ofl/notosanssc
- https://github.com/google/fonts/tree/main/ofl/notoserifsc
