# Vue 3 Snippets Pro Examples

## Table of Contents
- [Basic Templates](#basic-templates)
- [Composition API](#composition-api)
- [UI Framework Examples](#ui-framework-examples)
- [Real-world Examples](#real-world-examples)

## Basic Templates

### Vue 3 Setup Component
```vue
// Trigger: v3setup
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++
</script>

<template>
  <div>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<style scoped>
button {
  padding: 8px 16px;
  border-radius: 4px;
}
</style>
```

### TypeScript Component
```vue
// Trigger: v3setup-ts
<script setup lang="ts">
interface Props {
  title: string
  items: string[]
}

interface Emits {
  (e: 'select', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleSelect = (item: string) => {
  emit('select', item)
}
</script>

<template>
  <div>
    <h2>{{ title }}</h2>
    <ul>
      <li v-for="item in items" :key="item" @click="handleSelect(item)">
        {{ item }}
      </li>
    </ul>
  </div>
</template>
```

## Composition API

### Reactive State Management
```typescript
// Trigger: v3state
const count = ref(0)
const doubleCount = computed(() => count.value * 2)

const state = reactive({
  user: {
    name: '',
    age: 0
  },
  settings: {
    theme: 'light'
  }
})

watch(() => state.user, (newUser) => {
  console.log('User updated:', newUser)
}, { deep: true })

watchEffect(() => {
  console.log('Count is:', count.value)
  console.log('Double count is:', doubleCount.value)
})
```

### Custom Composable
```typescript
// Trigger: v3composable
export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  function reset() {
    count.value = initialValue
  }

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset
  }
}

// Usage
const { count, increment } = useCounter(10)
```

## UI Framework Examples

### Element Plus Search Form
```vue
// Trigger: v3el-search-table
<template>
  <el-form :model="searchForm" inline>
    <el-form-item label="Keyword">
      <el-input
        v-model="searchForm.keyword"
        placeholder="Enter keyword"
        clearable
        @keyup.enter="handleSearch"
      />
    </el-form-item>

    <el-form-item label="Status">
      <el-select
        v-model="searchForm.status"
        placeholder="Select status"
        clearable
      >
        <el-option label="Active" value="1" />
        <el-option label="Inactive" value="0" />
      </el-select>
    </el-form-item>

    <el-form-item label="Date Range">
      <el-date-picker
        v-model="searchForm.dateRange"
        type="daterange"
        range-separator="To"
        start-placeholder="Start date"
        end-placeholder="End date"
      />
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSearch">Search</el-button>
      <el-button @click="handleReset">Reset</el-button>
    </el-form-item>
  </el-form>

  <el-table
    v-loading="loading"
    :data="tableData"
    border
    stripe
  >
    <!-- Table columns -->
  </el-table>
</template>

<script setup lang="ts">
const searchForm = reactive({
  keyword: '',
  status: '',
  dateRange: []
})

const loading = ref(false)
const tableData = ref([])

const handleSearch = async () => {
  try {
    loading.value = true
    // API call logic
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}
</script>
```

### Ant Design Vue Form
```vue
// Trigger: v3a-form
<template>
  <a-form
    :model="formState"
    :rules="rules"
    @finish="onFinish"
  >
    <a-form-item label="Username" name="username">
      <a-input v-model:value="formState.username" />
    </a-form-item>

    <a-form-item label="Password" name="password">
      <a-input-password v-model:value="formState.password" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit">Submit</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
const formState = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: 'Please input your username!' }],
  password: [{ required: true, message: 'Please input your password!' }]
}

const onFinish = (values: any) => {
  console.log('Success:', values)
}
</script>
```

## Real-world Examples

### Authentication Form
```vue
// Trigger: v3auth-form
<script setup lang="ts">
interface LoginForm {
  email: string
  password: string
  remember: boolean
}

const form = reactive<LoginForm>({
  email: '',
  password: '',
  remember: false
})

const loading = ref(false)
const error = ref('')

const rules = {
  email: [
    { required: true, message: 'Email is required' },
    { type: 'email', message: 'Please enter a valid email' }
  ],
  password: [
    { required: true, message: 'Password is required' },
    { min: 6, message: 'Password must be at least 6 characters' }
  ]
}

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = ''
    // Login logic here
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- Form content -->
  </form>
</template>
```

### Search Table Combos (Element Plus / Naive UI / PrimeVue)
- Triggers: `v3el-search-table` / `v3n-search-table` / `v3prime-table`
- 内置：loading、分页、筛选、重置、操作列示例；已预留接口调用/占位符。
- 文档：Element Table https://element-plus.org/en-US/component/table.html ｜ Naive DataTable https://www.naiveui.com/en-US/os-theme/components/data-table ｜ PrimeVue DataTable https://primevue.org/datatable/

[Back to Cheat Sheet](cheatsheet.md)