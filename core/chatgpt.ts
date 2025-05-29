import { OpenAI } from 'openai';
import httpsAgent from '@/util/agent';
import type { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

class ChatGPT {
  private openai: OpenAI;
  private langModel: string;
  constructor({
    langModel,
    apiKey,
    apiBaseURL,
  }: {
    langModel: string;
    apiKey: string;
    apiBaseURL?: string;
  }) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: apiBaseURL,
      httpAgent: httpsAgent,
    });
    this.langModel = langModel;
  }

  async sendMessage(content: ChatCompletionUserMessageParam['content'], context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: content,
    });

    const res = await this.openai.chat.completions.create({
      model: this.langModel,
      messages,
    });

    const answer = res.choices[0]?.message?.content;
  
    return answer;
  }

  async getMessageStream(content: ChatCompletionUserMessageParam['content'], context?: ChatCompletionMessageParam[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: 'user',
      content: content,
    });

    const stream = await this.openai.chat.completions.create({
      model: this.langModel,
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
    const systemPrompt = `You are an translation assistant that translates >>>source_text<<< ${originalLang ? 'from language >>>source_language<<<' : ''}to languages >>>target_languages<<<, output should be a valid JSON, and JSON format should like >>>output_example<<<. Please provide result by JSON without any explanation, and output must be plain text format, not markdown format.`;
    
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
      model: this.langModel,
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
    langModel,
    apiKey,
    apiBaseURL,
  }: {
    langModel: string;
    apiKey: string;
    apiBaseURL?: string;
  }) => {
    instance = new ChatGPT({
      langModel,
      apiKey,
      apiBaseURL,
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
