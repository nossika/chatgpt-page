// 显式展示代码依赖（从 CDN 脚本引入的 window 全局变量）
var { 
  Vue, // https://cdn.jsdelivr.net/npm/vue@3.5.12/dist/vue.global.prod.js
  Vuetify, // https://cdn.jsdelivr.net/npm/vuetify@3.7.2/dist/vuetify.min.js
  marked, // https://cdn.jsdelivr.net/npm/marked/marked.min.js
} = window;

const util = {
  request: {
    post: async (url, data, type = 'json') => {
      let body;
      let additionHeaders = {};

      if (type === 'formdata') {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
        });
        body = formData;
      } else {
        additionHeaders = {
          'Content-Type': 'application/json',
        };
        body = JSON.stringify(data);
      }

      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'X-Key': util.getURLParams('key'),
          ...additionHeaders,
        },
        body,
      });

      if (response.status !== 200) {
        throw new Error(`${url} ${response.status} ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
    get: async (url, params) => {
      const paramsString = new URLSearchParams(params).toString();

      const response = await window.fetch(
        paramsString ? `${url}?${paramsString}` : url, 
        {
          method: 'get',
          headers: {
            'X-Key': util.getURLParams('key'),
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`${url} ${response.status} ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
  },

  getURLParams(key) {
    const params = new URLSearchParams(location.search);
    return params.get(key) || '';
  },

  setURLParams(key, val) {
    const params = new URLSearchParams(location.search);
    params.set(key, val);
    history.pushState(null, '', `?${params.toString()}`);
  },
};

const ChatApp = {
  setup() {
    const { ref, reactive, onMounted } = Vue;
    const loading = ref(false);
    const uploading = ref(false);
    const question = ref('');
    const questionError = ref('');
    const questionImage = ref('');
    const questionImageFile = ref(null);
    const questionImageError = ref('');
    const messageSalt = ref('');
    const conversations = reactive([]);
    const CONVERSATION_TYPE = {
      Q: 'Q',
      A: 'A',
    };

    onMounted(async () => {
      loading.value = true;
      const res = await util.request.get('/message-stream-salt')
        .then(res => res.json())
        .finally(() => {
          loading.value = false;
        });

      messageSalt.value = res.data;
    });
    
    const sendMessage = async () => {
      if (loading.value || !question.value) return;

      loading.value = true;
      const q = question.value;
      const qImg = questionImage.value;
      question.value = '';
      questionImage.value = '';
      questionImageFile.value = null;
      questionImageError.value = '';

      const context = conversations.slice();

      conversations.push({
        type: CONVERSATION_TYPE.Q,
        message: q,
        imgURL: qImg,
      });

      conversations.push({
        type: CONVERSATION_TYPE.A,
        message: '',
        displayMessage: '...',
      });
      
      // 先 push 到 conversations，再从中获取响应式的对象，使得后续对其修改能响应到 UI 上
      const reactiveAnswer = conversations[conversations.length - 1];

      questionError.value = '';
    
      try {
        const response = await util.request.post('/message-stream', {
          message: q,
          imgURL: qImg,
          context,
        });
  
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let tempText = '';
        const rawDataList = [];
        
        // 流式数据处理，持续输出临时数据到界面
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          rawDataList.push(value);
          tempText += decoder.decode(value);
          // 原始数据中有 salt，使用前需要先替换
          if (messageSalt.value) {
            tempText = tempText.replaceAll(messageSalt.value, '');
          }
          const mdText = marked.parse(tempText);
          if (!mdText) continue;
          reactiveAnswer.message = mdText;
        }

        // 完整处理数据（上一步逐个对原始 Uint8Array 解析并输出，可能会在边界处出现错误字符，最终全量解析 Uint8Array 可修复此情况）
        const rawData = new Uint8Array(rawDataList.reduce((len, data) => len + data.length, 0));
        let offset = 0;
        rawDataList.forEach(data => {
          rawData.set(data, offset);
          offset += data.length;
        });
  
        const finalText = decoder.decode(rawData).replaceAll(messageSalt.value, '');
        reactiveAnswer.message = finalText;
        reactiveAnswer.displayMessage = marked.parse(finalText);
      } catch (err) {
        questionError.value = String(err);
      }

      loading.value = false;
    };

    const uploadImage = async (file) => {
      questionImage.value = '';
      questionImageError.value = '';
      if (!file) {
        return;
      }

      const maxMb = 5;
      if (file.size > maxMb * 1024 * 1024) {
        questionImageError.value = `Image size must be less than ${maxMb} mb`;
        return;
      }

      uploading.value = true;
      try {
        const response = await util.request.post('/file/upload', {
          file,
        }, 'formdata')
          .then(res => res.json())
          .finally(() => {
            uploading.value = false;
          });
  
        const url = `${window.origin}${response.data}`;
  
        questionImage.value = url;
      } catch (err) {
        questionImageError.value = String(err);
      }
    };

    return {
      question,
      questionError,
      questionImage,
      questionImageFile,
      questionImageError,
      loading,
      sendMessage,
      conversations,
      CONVERSATION_TYPE,
      uploadImage,
      uploading,
    };
  },
  template: `
    <div>
      <v-card 
        v-for="(c, i) in conversations"
        class="pa-4 mb-6 d-flex"
        :loading="loading && i === conversations.length - 1"
      >
        <v-chip 
          class="mr-4 mt-3 flex-grow-0 flex-shrink-0"
          label
          :color="{[CONVERSATION_TYPE.Q]: 'primary', [CONVERSATION_TYPE.A]: 'purple'}[c.type]"
        >
          {{ c.type }}
        </v-chip>
        <div
          class="px-6 py-4 flex-grow-1 flex-shrink-1 border"
        >
          <div v-html="c.displayMessage || c.message"/>
          <v-img
            class="mt-4"
            v-if="c.imgURL"
            :src="c.imgURL"
            :max-height="240"
            :min-height="60"
          >
            <template v-slot:error>
              <div class="d-flex align-center justify-center fill-height">
                <v-icon icon="mdi-image-off"/>
              </div>
            </template>
          </v-img>
        </div>
      </v-card>
      <v-card class="pa-4">
        <v-textarea 
          label="Your Question"
          v-model="question"
          @keyup.ctrl.enter="sendMessage"
          :error-messages="questionError"
          placeholder="Use Ctrl + Enter to send"
          variant="outlined"
        />
        <v-file-input
          label="Attached Image"
          v-model="questionImageFile"
          @update:modelValue="uploadImage"
          :loading="uploading"
          accept="image/*"
          :error-messages="questionImageError"
          variant="outlined"
          show-size
        />
        <v-img
          class="mb-4"
          v-if="questionImage"
          :src="questionImage"
          :max-height="240"
          :min-height="60"
        >
          <template v-slot:error>
            <div class="d-flex align-center justify-center fill-height">
              <v-icon icon="mdi-image-off"/>
            </div>
          </template>
        </v-img>
        <v-btn
          @click="sendMessage"
          :loading="loading"
          :disabled="!question"
          color="teal-darken-1"
          prepend-icon="mdi-send"
        >
          SEND
        </v-btn>
      </v-card>
    </div>
  `,
};

const ImageApp = {
  setup() {
    const { ref } = Vue;
    const loading = ref(false);
    const description = ref('');
    const imageTitle = ref('');
    const imageURL = ref('');

    const drawImage = async () => {
      if (loading.value || !description.value) return;
      loading.value = true;
      imageTitle.value = description.value;
      description.value = '';

      try {
        const raw = await util.request.post('/draw-image', {
          description: imageTitle.value,
        });

        const res = await raw.json();

        if (res.code !== 0) {
          throw new Error(res.data || JSON.stringify(res));
        }

        imageURL.value = res.data;
      } catch (err) {
        imageTitle.value = err.toString();
      }

      loading.value = false;
    };

    return {
      loading,
      description,
      imageTitle,
      imageURL,
      drawImage,
    };
  },
  template: `
    <div>
      <v-card
        v-if="imageTitle"
        class="pa-4 mb-5"
        :loading="loading"
      >
        <div class="text-center">{{ imageTitle }}</div>
        <v-img v-if="imageURL" :src="imageURL">
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular indeterminate />
            </div>
          </template>
        </v-img>
      </v-card>
      <v-card class="pa-4">
        <v-text-field label="Your Description" variant="outlined" v-model="description" @keyup.ctrl.enter="drawImage" placeholder="Use Ctrl + Enter to draw" />
        <v-btn
          @click="drawImage" :loading="loading" :disabled="!description"
          color="teal-darken-1" prepend-icon="mdi-draw"
        >
          DRAW
        </v-btn>
      </v-card>
    </div>
  `,
};

const TranslateApp = {
  setup() {
    const { ref, computed } = Vue;
    const loading = ref(false);
    const inputText = ref('');
    const originalText = ref('');
    const translateResp = ref(null);
    const errorMessage = ref('');
    const originalLang = ref('');
    const targetLangs = ref(['zh', 'en']);

    const allLangs = [
      { title: '简体中文', value: 'zh' },
      { title: '繁體中文', value: 'zh-hant' },
      { title: 'English', value: 'en' },
      { title: '日本語', value: 'ja' },
      { title: '한국어', value: 'ko' },
      { title: 'Français', value: 'fr' },
      { title: 'Deutsch', value: 'de' },
      { title: 'Español', value: 'es' },
      { title: 'Русский язык', value: 'ru' },
      { title: 'हिन्दी', value: 'hi' },
      { title: 'ภาษาไทย', value: 'th' },
      { title: 'اَلْعَرَبِيَّةُ', value: 'ar' },
    ];

    const getLangTitle = (value) => {
      return allLangs.find(l => l.value === value)?.title || '';
    };

    const translate = async () => {
      if (loading.value || !inputText.value) return;
      errorMessage.value = '';
      originalText.value = inputText.value;

      loading.value = true;
      try {
        const raw = await util.request.post('/translate', {
          text: originalText.value,
          targetLangs: targetLangs.value,
          originalLang: originalLang.value,
        });

        const res = await raw.json();

        if (res.code !== 0) {
          throw new Error(res.data || JSON.stringify(res));
        }

        translateResp.value = res.data;
      } catch (err) {
        errorMessage.value = err.toString();
      } finally {
        loading.value = false;
      }
    };

    const translations = computed(() => {
      const result = [];
      if (originalText.value) {
        result.push({
          lang: 'Original' + (originalLang.value ? `(${getLangTitle(originalLang.value)})` : ''), 
          text: originalText.value,
        });
      }

      translateResp.value && Object.entries(translateResp.value).forEach(([key, value]) => {
        result.push({ 
          lang: getLangTitle(key), 
          text: value,
        });
      });

      return result;
    });

    return {
      inputText,
      translate,
      errorMessage,
      loading,
      originalLang,
      targetLangs,
      translations,
      allLangs,
    };
  },
  template: `
    <div>
      <v-card class="pa-4">
        <v-textarea label="Original Text" variant="outlined" v-model="inputText" @keyup.ctrl.enter="translate" placeholder="Use Ctrl + Enter to submit" />
        <v-select
          variant="outlined"
          label="Original Language"
          v-model="originalLang"
          :items="[{ title: 'Auto', value: '' }].concat(allLangs)"
        />
        <v-select
          variant="outlined"
          label="Target Languages"
          multiple
          v-model="targetLangs"
          :items="allLangs"
        />
        <v-btn
          @click="translate" :loading="loading" :disabled="!inputText || !targetLangs.length"
          color="teal-darken-1" prepend-icon="mdi-translate"
        >
          TRANSLATE
        </v-btn>
      </v-card>
      <v-card v-if="translations.length || errorMessage" :loading="loading" class="pa-4 mt-4">
        <v-alert v-if="errorMessage" color="error" class="mb-4">
          {{ errorMessage }}
        </v-alert>
        <v-table v-if="translations.length">
          <thead>
            <tr>
              <th class="text-left">
                Language
              </th>
              <th class="text-left">
                Text
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in translations"
              :key="item.lang"
            >
              <td>{{ item.lang }}</td>
              <td>{{ item.text }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>
  `,
};

const App = {
  setup() {
    const { ref, watchEffect } = Vue;
    const tabs = [
      {
        key: 'chat',
        name: 'chat',
        component: 'ChatApp',
      },
      {
        key: 'translate',
        name: 'translate',
        component: 'TranslateApp',
      },
      util.getURLParams('enable-image') && {
        key: 'image',
        name: 'image',
        component: 'ImageApp',
      },
    ].filter(Boolean);

    const tab = ref(util.getURLParams('tab') || 'chat');

    watchEffect(() => {
      util.setURLParams('tab', tab.value);
    });

    return {
      tabs,
      tab,
    };
  },
  template: `
    <v-container>
      <div class="mb-5 d-flex justify-center">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
          mandatory="force"
        >
          <v-btn v-for="t in tabs" :value="t.key" :key="t.key">
            {{ t.name }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <template v-for="t in tabs">
          <component :is="t.component" v-if="tab === t.key"/>
        </template>
      </div>
    </v-container>
  `,
};

const { createApp } = Vue;
const { createVuetify } = Vuetify;

const app = createApp(App);
const vuetify = createVuetify();

app.component('ChatApp', ChatApp);
app.component('TranslateApp', TranslateApp);
app.component('ImageApp', ImageApp);

app.use(vuetify).mount('#app');
