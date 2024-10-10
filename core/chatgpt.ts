import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import request from '@/util/request';

// @refer: https://platform.openai.com/docs/api-reference/models/list
const model = 'gpt-3.5-turbo';

class ChatGPT {
  private openai: OpenAIApi;
  constructor({
    key,
  }: {
    key: string;
  }) {
    const configuration = new Configuration({
      apiKey: key,
    });
    
    const openai = new OpenAIApi(configuration, undefined, request);

    this.openai = openai;
  }

  async sendMessage(message: string, context?: ChatCompletionRequestMessage[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message,
    });

    const res = await this.openai.createChatCompletion({
      model,
      messages,
    });

    const content = res.data.choices[0]?.message?.content;
  
    return content;
  }

  async getMessageStream(message: string, context?: ChatCompletionRequestMessage[]) {
    const messages = context?.slice() || [];
    messages.push({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message,
    });

    const res = await this.openai.createChatCompletion({
      model,
      messages,
      stream: true,
    }, {
      responseType: 'stream',
    });

    return res.data as any as Receiver;
  }

  async translate(text: string, lang: string, targetLangs: string[]) {
    const systemPrompt = `You are an translation assistant that translates >>>source_text<<< from language >>>source_language<<< to languages >>>target_languages<<<, output should be a valid JSON, format should like >>>output_example<<<. Provide translations without any explanation`;
    
    interface TranslateResult {
      [lang: string]: string;
    }

    const userPrompt = JSON.stringify({
      source_language: lang,
      target_languages: targetLangs,
      source_text: text,
      output_example: targetLangs.reduce((json, lang) => {
        json[lang] = '';
        return json;
      }, {} as TranslateResult),
    });

    const messages = [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: systemPrompt,
      },
      {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: userPrompt,
      }
    ];

    const res = await this.openai.createChatCompletion({
      model,
      temperature: 0.2,
      messages,
    });

    const content = res.data.choices[0]?.message?.content;

    let json = {} as TranslateResult;
    try {
      json = JSON.parse(content);
    } catch (err) {
      throw new Error(`Invalid JSON: ${content}`);
    }

    return json;
  }

  async drawImage(description: string) {
    const res = await this.openai.createImage({
      prompt: description,
      n: 1,
    });

    return res.data.data[0]?.url || '';
  }
}

export interface Receiver {
  on: (type: 'data' | 'end', handler: (data: Buffer) => void) => void;
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
