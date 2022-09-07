/*
 * @Author: zlc
 * @Date: 2022-09-02 17:26:00
 * @LastEditTime: 2022-09-07 09:54:07
 * @LastEditors: zlc
 * @Description:
 * @FilePath: \project-template-ui-plus\.eslintrc.js
 */
module.exports = {
  root: true,
  env: {
    'vue/setup-compiler-macros': true,
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint',
    // eslint-config-prettier 的缩写
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2021,
  },
  plugins: [],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'vue/multi-word-component-names': 'off',
    semi: 0,
  },
  globals: {
    uni: true,
    wx: true,
  },
}
