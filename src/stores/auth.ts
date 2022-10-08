import { defineStore } from 'pinia';
  import { DangNhap } from "src/apis/runs/dang-nhap"
import { parse } from "set-cookie-parser"
import cookie from "js-cookie"
import { post } from "src/logic/http"

interface User {
          avatar: string
          email:string
          name:string
          sex: string
          username: string
        }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user_data: parseJSON(cookie.get("user_data")) as (null | {
      value: User
      expires: number
    }),
    token_name: (cookie.get("token_name")??null) as null | string,
    token_value: (cookie.get("token_value")??null) as null | string
  }),
  getters: {
    user(state) {
      if (!state.user_data || state.user_data.expires < Date.now()) return null

      return state.user_data.value
    },
    isLogged(state) {
      return !!state.token_name && !!state.token_value && !!state.user_data
    }
  },
  actions: {
    setUser(value: User, expires: number) {
      this.user_data = { value, expires }
      cookie.set("user_data", JSON.stringify({value, expires}), { expires })
    },
    setToken(name: string, value: string, expires: number) {
      this.token_name = name
      this.token_value = value
      cookie.set("token_name", (name), { expires })
      cookie.set("token_value", (value), { expires })
    },
    deleteUser() {
      this.user_data = null
      cookie.set("user_data", "", { expires: -1 })
    },
    deleteToken() {
      this.token_name = null
      this.token_value = null;
      cookie.set("token_name", "", { expires: -1 })
      cookie.set("token_value", "", { expires: -1 })
    },
    setTokenByCookie(cookie: string) {
      const token = parse(cookie).find(item => item.name.startsWith("token"))!
      // set token
      this.setToken(token.name, token.value, token.expires)
      return token
    },
    // ** actions **
    async login(email: string, password: string) {
      const data = await DangNhap(email, password)

      const { expires } = this.setTokenByCookie(data.cookie)
      this.setUser({
          avatar: data.avatar,
          email: data.email,
          name: data.name,
          sex: data.sex,
          username: data.username
        },
        expires
      )

      return data;
    },
    async logout() {
      this.deleteToken()
      this.deleteUser()
    },
    async changePassword(newPassword: string) {
      const { headers } = await post("/account/info/", {
        'User[hoten]': this.user.username,
        'User[gender]': this.user.sex,
        "User[password]": newPassword,
        submit: "Cập nhật"
      }, {
cookie:`${this.token_name}=${this.token_value}`
      }).catch(res => {
      if (res.status === 302 && res.data) return Promise.resolve(res)

      return Promise.reject(res)
      })

      const cookie = new Headers(headers).get("set-cookie")
      this.setTokenByCookie(cookie)
    }
  }
});

function parseJSON(value?: string) {
  if (!value) return null

  try {
    return JSON.parse(value) ?? null
  } catch {
    return null
  }
}
