import { ref } from 'vue';

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
}

const template = `
<div style="padding: 20px;">
  <div>
    <v-text-field label="your question" variant="outlined" :question="question" @input="setQuestion" @keyup.enter="ask" :loading="loading">
      <template v-slot:append>
        <v-btn class="mt-n2" @click="ask" :loading="loading" :disabled="!question">
          ASK
        </v-btn>
      </template>
    </v-text-field>
  </div>
  <v-card v-if="answer">
    <pre style="margin: 20px; white-space: pre-wrap">{{ answer }}</pre>
  </v-card>
</div>
`;

const App = {
  setup() {
    const loading = ref(false);
    const question = ref('');
    const answer = ref('');

    const ask = async () => {
      if (loading.value || !question.value) return;
      loading.value = true;
      const res = await request.post('/ask', {
        question: question.value,
      });

      answer.value = res.data;
      loading.value = false;
    };

    const setQuestion = (event) => {
      question.value = event.target.value;
    };

    return {
      question,
      setQuestion,
      loading,
      ask,
      answer,
    }
  },
  mounted() {
  },
  template,
};

    
export default App;