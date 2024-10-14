import { OpenAI } from 'openai';
import httpsAgent from '@/util/agent';
import type { ChatCompletionMessageParam } from 'openai/resources';

// @refer: https://platform.openai.com/docs/api-reference/models/list
const model = 'gpt-4o-mini';

class ChatGPT {
  private openai: OpenAI;
  constructor({
    key,
  }: {
    key: string;
  }) {
    this.openai = new OpenAI({
      apiKey: key,
      httpAgent: httpsAgent,
    });
  }

  async sendMessage(message: string, context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: message,
    });

    const res = await this.openai.chat.completions.create({
      model,
      messages,
    });

    const content = res.choices[0]?.message?.content;
  
    return content;
  }

  async getMessageStream(message: string, context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: message,
    });

    const stream = await this.openai.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    async function* iterator() {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    }

    const proxyStream = {
      [Symbol.asyncIterator]() {
        return iterator();
      },
    };

    return proxyStream;
  }

  async translate(text: string, targetLangs: string[], originalLang?: string) {
    const systemPrompt = `You are an translation assistant that translates >>>source_text<<< ${originalLang ? 'from language >>>source_language<<<' : ''} to languages >>>target_languages<<<, output should be a valid JSON, and JSON format should like >>>output_example<<<. Please provide result by JSON without any explanation`;
    
    interface TranslateResult {
      [lang: string]: string;
    }

    const userPrompt = JSON.stringify({
      source_language: originalLang,
      target_languages: targetLangs,
      source_text: text,
      output_example: targetLangs.reduce((json, lang) => {
        json[lang] = '';
        return json;
      }, {} as TranslateResult),
    });

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      }
    ];

    const res = await this.openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages,
    });

    const content = res.choices[0]?.message?.content;

    let json = {} as TranslateResult;
    try {
      json = JSON.parse(content);
    } catch (err) {
      throw new Error(`Invalid JSON: ${content}`);
    }

    return json;
  }

  async drawImage(description: string) {
    const res = await this.openai.images.generate({
      prompt: description,
      n: 1,
    });

    return res.data[0]?.url || '';
  }
}

let instance: ChatGPT | null = null;

const chatGPT = {
  init: ({
    key,
  }: {
    key: string,
  }) => {
    instance = new ChatGPT({
      key,
    });
  },
  get: () => {
    if (!instance) {
      throw new Error('Cannot get before init');
    }

    return instance;
  },
};

export default chatGPT;
