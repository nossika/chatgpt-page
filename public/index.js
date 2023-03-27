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

const parseStreamData = (data) => {
  const str = decoder.decode(data);

  return str
    .split('\n')
    .map(s => s.trim())
    .filter(s => !!s)
    .map(s => {
      const JSONStr = s.replace('data: ', '');
      let json;
      try {
        json = JSON.parse(JSONStr);
      } catch (err) {
        json = null;
      }
      return json;
    })
    .filter(s => !!s);
};

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
  <v-text-field label="your message" variant="outlined" :value="message" @input="setMessage" @keyup.enter="sendMessage">
    <template v-slot:append>
      <v-btn class="mt-n2" @click="sendMessage" :loading="loading" :disabled="!message">
        SEND
      </v-btn>
    </template>
  </v-text-field>
</div>
</div>
`;

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

        while (true) {
          const { value, done } = await stream.read();
          if (done) break;

          const datas = parseStreamData(value);

          datas.forEach(data => {
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
