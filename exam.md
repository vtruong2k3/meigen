# Image Generation API Examples


## Seedream tham số
```Python
from typing import Optional, List, Union


class SequentialImageGenerationOptions:
    """仅 doubao-seedream-5.0-lite/4.5/4.0 支持该参
    组图功能的配置。仅当 sequential_image_generation 为 auto 时生效。
    """
    """指定本次请求，最多可生成的图片数量，取值范围： [1, 15]
    默认值 15
    """
    max_images: Optional[int]

    def __init__(self, max_images: Optional[int]) -> None:
        self.max_images = max_images


class ApifoxModel:
    """模型输出结果与prompt的一致程度，生成图像的自由度，又称为文本权重；值越大，模型自由度越小，与用户输入的提示词相关性越强，取值范围：[1, 10] 。
    - doubao-seedream-3.0-t2i 默认值 2.5
    - doubao-seededit-3.0-i2i 默认值 5.5
    - doubao-seedream-5.0-lite/4.5/4.0 不支持
    """
    guidance_scale: Optional[float]
    """输入的图片信息，支持 URL 或 Base64 编码。
    
    - 图片URL：请确保图片URL可被访问。
    - Base64编码：请遵循此格式data:image/<图片格式>;base64,<Base64编码>。注意 <图片格式> 需小写，如
    data:image/png;base64,<base64_image>。
    """
    image: Optional[Union[List[str], str]]
    """- 支持：文生图
    - doubao-seedream-3-0-t2i-250415
    - 支持：图片编辑
    - doubao-seededit-3-0-i2i-250628
    - 支持：文生图、图生图
    - doubao-seedream-5-0-260128
    - doubao-seedream-4-5-251128
    - doubao-seedream-4-0-250828
    """
    model: str
    """仅 doubao-seedream-5.0 支持该参
    指定生成图像的文件格式。可选值：
    - png
    - jpeg
    
    默认值 jpeg
    """
    output_format: Optional[str]
    """用于生成图像的提示词。"""
    prompt: str
    """指定生成图像的返回格式。支持以下两种返回方式：
    - url：返回图片下载链接；链接在图片生成后24小时内有效，请及时下载图片。
    - b64_json：以 Base64 编码字符串的 JSON 格式返回图像数据。
    
    默认值 url
    """
    response_format: Optional[str]
    """仅 doubao-seedream-3.0-t2i/seededit-3.0-i2i 支持该参
    随机数种子，用于控制模型生成内容的随机性。取值范围为 [-1, 2147483647]。
    注意：
    - 相同的请求下，模型收到不同的seed值，如：不指定seed值或令seed取值为-1（会使用随机数替代）、或手动变更seed值，将生成不同的结果。
    - 相同的请求下，模型收到相同的seed值，会生成类似的结果，但不保证完全一致。
    """
    seed: Optional[int]
    """仅 doubao-seedream-5.0-lite/4.5/4.0 支持该参
    控制是否关闭组图功能；基于您输入的内容，生成的一组内容关联的图片。
    - auto：自动判断模式，模型会根据用户提供的提示词自主判断是否返回组图以及组图包含的图片数量。
    - disabled：关闭组图功能，模型只会生成一张图。
    
    默认值 disabled
    """
    sequential_image_generation: Optional[str]
    """仅 doubao-seedream-5.0-lite/4.5/4.0 支持该参
    组图功能的配置。仅当 sequential_image_generation 为 auto 时生效。
    """
    sequential_image_generation_options: Optional[SequentialImageGenerationOptions]
    size: Optional[str]
    """是否在生成的图片中添加水印。
    - false：不添加水印。
    - true：在图片右下角添加“AI生成”字样的水印标识。
    
    默认值 true
    """
    watermark: Optional[bool]

    def __init__(self, guidance_scale: Optional[float], image: Optional[Union[List[str], str]], model: str, output_format: Optional[str], prompt: str, response_format: Optional[str], seed: Optional[int], sequential_image_generation: Optional[str], sequential_image_generation_options: Optional[SequentialImageGenerationOptions], size: Optional[str], watermark: Optional[bool]) -> None:
        self.guidance_scale = guidance_scale
        self.image = image
        self.model = model
        self.output_format = output_format
        self.prompt = prompt
        self.response_format = response_format
        self.seed = seed
        self.sequential_image_generation = sequential_image_generation
        self.sequential_image_generation_options = sequential_image_generation_options
        self.size = size
        self.watermark = watermark
```

## Seedream-5.0/4.5/4.0 - t2i
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "保持模特姿势和液态服装的流动形状不变。将服装材质从银色金属改为完全透明的清水（或玻璃）。透过液态水流，可以看到模特的皮肤细节。光影从反射变为折射。",
    "image": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_5_imageToimage.png",
    "size": "2K",
    "output_format": "png",
    "watermark": false
}'

## Seedream-5.0/4.5/4.0 - i2i
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "充满活力的特写编辑肖像，模特眼神犀利，头戴雕塑感帽子，色彩拼接丰富，眼部焦点锐利，景深较浅，具有Vogue杂志封面的美学风格，采用中画幅拍摄，工作室灯光效果强烈。",
    "size": "2K",
    "output_format": "png",
    "response_format": "url",
    "watermark": false
}'

## seedream-5.0/4.5/4.0 - Ghép nhiều hình ảnh
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "将图1的服装换为图2的服装",
    "image": [
        "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_1.png",
        "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_5_imagesToimage_2.png"
    ],
    "sequential_image_generation": "disabled",
    "size": "2K",
    "output_format": "png",
    "watermark": false
}'

## Seedream-5.0/4.5/4.0 - Nhiều ảnh tham chiếu cho các ảnh được tạo ra
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seedream-5-0-260128",
    "prompt": "生成3张女孩和奶牛玩偶在游乐园开心地坐过山车的图片，涵盖早晨、中午、晚上",
    "image": [
        "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_1.png",
        "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_2.png"
    ],
    "sequential_image_generation": "auto",
    "sequential_image_generation_options": {
        "max_images": 3
    },
    "size": "2K",
    "output_format": "png",
    "watermark": false
}'

## seedream-3.0-t2i
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seedream-3-0-t2i-250415",
    "prompt": "鱼眼镜头，一只猫咪的头部，画面呈现出猫咪的五官因为拍摄方式扭曲的效果。",
    "response_format": "url",
    "size": "1024x1024",
    "seed": 12,
    "guidance_scale": 2.5,
    "watermark": true
}'

## seededit-3.0-i2i
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "doubao-seededit-3-0-i2i-250628",
    "prompt": "改成爱心形状的泡泡",
    "image": "https://ark-project.tos-cn-beijing.volces.com/doc_image/seededit_i2i.jpeg",
    "response_format": "url",
    "size": "adaptive",
    "seed": 21,
    "guidance_scale": 5.5,
    "watermark": true
}'

## Grok-3-image
curl --location --request POST 'https://api.chainhub.tech/v1/images/generations' \
--header 'Authorization: Bearer ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "model": "grok-3-image",
    "prompt": "a cat",
    "size": "960x960"
}'

## Grok-3 editing image
curl --location --request POST 'https://api.chainhub.tech/v1/images/edits' \
--header 'Authorization: Bearer ' \
--form 'model="grok-3-image"' \
--form 'prompt="加一只小鸭"' \
--form 'image=@"C:\\Users\\y\\Pictures\\image-edit-2.webp"'

# Video Generation API Examples
## Veo 3.1 flash
curl --location --request POST 'https://api.chainhub.tech/v1/videos' \
--header 'Authorization: Bearer <token>' \
--form 'model="veo_3_1-fast"' \
--form 'prompt="让牛快乐的跳科目三"' \
--form 'seconds="8"' \
--form 'input_reference=@"C:\\Users\\Administrator\\Desktop\\场景1.png"' \
--form 'size="16x9"' \
--form 'watermark="false"'

## Veo 3.1 components
curl --location --request POST 'https://api.chainhub.tech/v1/video/create' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "prompt": "牛飞上天了",
    "model": "veo3.1-components",
    "images": [
        "https://filesystem.site/cdn/20250612/VfgB5ubjInVt8sG6rzMppxnu7gEfde.png",
        "https://filesystem.site/cdn/20250612/998IGmUiM2koBGZM3UnZeImbPBNIUL.png",
        "https://iknow-pic.cdn.bcebos.com/5882b2b7d0a20cf4ced1ab5f64094b36adaf99e9"
    ],
    "enhance_prompt": true,
    "enable_upsample": true,
    "aspect_ratio": "16:9"
}'

## veo 3.1 fast-frames ảnh đầu và ảnh cuối
curl --location --request POST 'https://api.chainhub.tech/v1/video/create' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "prompt": "牛飞上天了",
    "model": "veo3-fast-frames",
    "images": [
        "https://filesystem.site/cdn/20250612/VfgB5ubjInVt8sG6rzMppxnu7gEfde.png",
        "https://filesystem.site/cdn/20250612/998IGmUiM2koBGZM3UnZeImbPBNIUL.png"
    ],
    "enhance_prompt": true,
    "enable_upsample": true,
    "aspect_ratio": "16:9"
}'

## Veo 3 query
curl --location --request GET 'https://api.chainhub.tech/v1/video/query?id=veo3.1-fast:1770350082-trii1OXZc3' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'

curl --location --request GET 'https://api.chainhub.tech/v1/videos/sora-2:task_01k81e7r1mf0qtvp3ett3mr4jm' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>'

