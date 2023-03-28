const template = `
<div style="padding: 20px;">
  <v-card v-for="(c, i) in conversations" style="margin-bottom: 20px; padding: 10px; display: flex;" :loading="loading && i === conversations.length - 1">
    <v-chip style="flex-grow: 0; flex-shrink: 0; margin-right: 10px; margin-top: 6px;"
      label
      :color="{[conversationType.Q]: 'primary', [conversationType.A]: 'cyan'}[c.type]"
    >
      {{ c.type }}
    </v-chip>
    <pre style="padding: 10px; white-space: pre-wrap; border: 1px solid #eee; flex-grow: 1; flex-shrink: 1;">{{ c.content }}</pre>
  </v-card>
  <div>
    <v-textarea label="your message" variant="outlined" :value="message" @input="setMessage" @keyup.ctrl.enter="sendMessage" placeholder="Use Ctrl + Enter to send">
      <template v-slot:append>
        <v-btn @click="sendMessage" :loading="loading" :disabled="!message">
          SEND
        </v-btn>
      </template>
    </v-textarea>
  </div>
</div>
`;

const { ref, reactive } = Vue;

const request = {
  post: async (url, data) => {
    const response = await window.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  stream: async (url, data) => {
    const response = await window.fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.body.getReader();
  }
};

const decoder = new TextDecoder();

const parseStreamData = (uint8Array, lastRemain = '') => {
  const originStr = lastRemain + decoder.decode(uint8Array);

  let remain = '';

  // split originStr by line
  const dataStrs = originStr
    .split('\n')
    .map(s => s.trim())
    .filter(s => !!s);

  const jsons = [];

  for (let i = 0; i < dataStrs.length; i += 1) {
    // each line starts with 'data: '
    const JSONStr = dataStrs[i].replace('data: ', '');
    let json;
    try {
      json = JSON.parse(JSONStr);
      json && jsons.push(json);
    } catch (err) {
      if (i === dataStrs.length - 1) {
        // if the last line cannot be parsed, it is usually because the line is incomplete, and it should be left over for the next parsing
        // @fixeme: last char may be decode to �
        remain = dataStrs[i];
      }
    }
  }

  return {
    jsons,
    remain,
  };
};

const App = {
  setup() {
    const loading = ref(false);
    const message = ref('');
    const conversations = reactive([]);
    const conversationType = {
      Q: 'Q',
      A: 'A',
    };

    const sendMessage = async () => {
      if (loading.value || !message.value) return;
      loading.value = true;
      const m = message.value;
      const context = conversations.slice();

      conversations.push({
        type: conversationType.Q,
        content: m,
      });

      message.value = '';

      conversations.push({
        type: conversationType.A,
        content: '',
      });
      
      // get reactive obejct
      const answer = conversations[conversations.length - 1];

      try {
        const stream = await request.stream('/message-stream', {
          message: m,
          context,
        });

        let dataRemain = '';

        while (true) {
          const { value, done } = await stream.read();
          if (done) break;

          const { jsons, remain } = parseStreamData(value, dataRemain);
          dataRemain = remain;

          jsons.forEach(data => {
            const chunk = data.choices[0].delta.content || '';
            answer.content += chunk;
          });
        }
      } catch (err) {
        answer.content = err.toString();
      }

      loading.value = false;
    };

    const setMessage = (event) => {
      message.value = event.target.value;
    };

    return {
      message,
      setMessage,
      loading,
      sendMessage,
      conversations,
      conversationType,
    };
  },
  template,
};

const { createApp } = Vue;
const { createVuetify } = Vuetify;

const vuetify = createVuetify();
const app = createApp(App);
app.use(vuetify).mount('#app');
