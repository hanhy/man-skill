# man-skill

A lightweight prompt pattern for making an AI imitate one specific person from a small amount of text.

## English

This repo is for a simple idea:

Give the model a compact description of one person, plus a few writing samples, and make it imitate that person's style, tone, and habits consistently.

The goal is not perfect identity cloning.
The goal is practical imitation:
- similar tone
- similar phrasing
- similar values and preferences
- similar speaking rhythm
- similar recurring habits or quirks

This is useful when you want to:
- create a personal assistant with a strong voice
- preserve a consistent character or persona
- prototype a digital twin from text only
- make prompt-based role imitation easier for normal users

### Basic approach

1. Describe who the person is
2. Add representative text samples
3. Summarize repeated traits, preferences, and patterns
4. Instruct the model to stay faithful to that voice
5. Keep updating the profile as you learn more

### Design principle

The system should be easy enough that anyone can imitate a single person with only some text, without building a large pipeline or doing model fine-tuning.

---

## 中文

这个仓库的目标很简单：

用少量文字描述一个人，再加上一些这个人的文本样本，让 AI 尽量稳定地模仿这个人的语气、风格和表达习惯。

目标不是做“完美复制”。
目标是做“实用模仿”，包括：
- 语气接近
- 用词接近
- 价值取向和偏好接近
- 说话节奏接近
- 一些固定习惯和小特点接近

这个方向适合用来：
- 做一个有明确个人风格的助手
- 保持角色或人格设定的一致性
- 只靠文本原型化一个数字分身
- 让普通用户也能更容易地通过 prompt 模仿某个人

### 基本方法

1. 描述这个人是谁
2. 提供有代表性的文本样本
3. 总结重复出现的性格、偏好和表达模式
4. 要求模型持续忠于这种声音
5. 随着了解加深，不断更新这个人物档案

### 设计原则

这个系统应该足够简单，让任何人只靠一些文本就能模仿一个具体的人，而不需要复杂流程，也不需要做模型微调。
