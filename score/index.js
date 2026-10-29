const app = Vue.createApp({
  data() {
    return {
      page: 0
    }
  },
  methods: {
    setPage(p) {
      this.page = p;
    }
  }
}).mount("#main");