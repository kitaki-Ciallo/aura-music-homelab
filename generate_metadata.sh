#!/bin/bash

# 检查是否提供了目录参数
if [ -z "$1" ]; then
    echo "用法: $0 <音乐目录路径> [URL前缀]"
    echo "示例: $0 /var/www/music /music"
    exit 1
fi

MUSIC_DIR="$1"
URL_PREFIX="${2:-/music}" # 如果未提供，默认为 /music
OUTPUT_FILE="$MUSIC_DIR/metadata.json"

# 检查目录是否存在
if [ ! -d "$MUSIC_DIR" ]; then
    echo "错误: 目录 '$MUSIC_DIR' 不存在。"
    exit 1
fi

# 开始 JSON 数组
echo "[" > "$OUTPUT_FILE"

FIRST=true
ID=1

# 查找音频文件 (mp3, flac, m4a, wav, ogg)
# 使用 -print0 和 read -d '' 来正确处理包含空格和特殊字符的文件名
find "$MUSIC_DIR" -type f \( -iname "*.mp3" -o -iname "*.flac" -o -iname "*.m4a" -o -iname "*.wav" -o -iname "*.ogg" \) -print0 | sort -z | while IFS= read -r -d '' FILE; do
    # 获取不带路径的文件名
    FILENAME=$(basename "$FILE")
    
    # 尝试从文件名提取歌手和标题 (假设格式为 "歌手 - 标题.ext")
    # 移除扩展名
    NAME_NO_EXT="${FILENAME%.*}"
    
    if [[ "$NAME_NO_EXT" == *" - "* ]]; then
        ARTIST="${NAME_NO_EXT%% - *}"
        TITLE="${NAME_NO_EXT#* - }"
    else
        ARTIST="Unknown Artist"
        TITLE="$NAME_NO_EXT"
    fi
    
    # 转义引号以符合 JSON 格式 (处理双引号和反斜杠)
    # 注意：单引号在 JSON 中不需要转义，但为了安全起见，我们主要处理双引号
    TITLE=$(echo "$TITLE" | sed 's/\\/\\\\/g; s/"/\\"/g')
    ARTIST=$(echo "$ARTIST" | sed 's/\\/\\\\/g; s/"/\\"/g')
    FILENAME_ESCAPED=$(echo "$FILENAME" | sed 's/\\/\\\\/g; s/"/\\"/g')
    
    # 查找封面图片 (同名但后缀为 jpg/png)
    COVER_URL=""
    BASE_PATH="${FILE%.*}"
    if [ -f "${BASE_PATH}.jpg" ]; then
        COVER_NAME=$(basename "${BASE_PATH}.jpg")
        # 对 URL 进行编码处理比较复杂，这里简单处理空格
        COVER_NAME_URL=$(echo "$COVER_NAME" | sed 's/ /%20/g')
        COVER_URL="$URL_PREFIX/$COVER_NAME_URL"
    elif [ -f "${BASE_PATH}.png" ]; then
        COVER_NAME=$(basename "${BASE_PATH}.png")
        COVER_NAME_URL=$(echo "$COVER_NAME" | sed 's/ /%20/g')
        COVER_URL="$URL_PREFIX/$COVER_NAME_URL"
    elif [ -f "${BASE_PATH}.jpeg" ]; then
        COVER_NAME=$(basename "${BASE_PATH}.jpeg")
        COVER_NAME_URL=$(echo "$COVER_NAME" | sed 's/ /%20/g')
        COVER_URL="$URL_PREFIX/$COVER_NAME_URL"
    fi

    # 对文件名进行简单的 URL 编码 (主要是空格)
    FILENAME_URL=$(echo "$FILENAME_ESCAPED" | sed 's/ /%20/g')
    
    # 处理 JSON 数组的逗号
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$OUTPUT_FILE"
    fi
    
    # 生成 JSON 对象
    # 使用简单模板。如果需要强大的 ID3 标签读取，需要安装 'ffmpeg' 或 'id3tool'。
    # 为了简单和零依赖，此脚本仅依赖文件名解析。
    cat <<EOF >> "$OUTPUT_FILE"
  {
    "id": "server-$ID",
    "title": "$TITLE",
    "artist": "$ARTIST",
    "fileUrl": "$URL_PREFIX/$FILENAME_URL",
    "coverUrl": "$COVER_URL"
  }
EOF
    
    ((ID++))
done

# 结束 JSON 数组
echo "" >> "$OUTPUT_FILE"
echo "]" >> "$OUTPUT_FILE"

echo "成功！已在 $OUTPUT_FILE 生成 metadata.json"
COUNT=$(grep -c '"id":' "$OUTPUT_FILE")
echo "共找到 $COUNT 首歌曲。"
