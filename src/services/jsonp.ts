let counter = 0

export function jsonp<T>(url: string, params: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_${Date.now()}_${++counter}`
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as Record<string, unknown>)[callbackName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`JSONP request timeout: ${url}`))
    }, 15000)

    ;(window as Record<string, unknown>)[callbackName] = (data: T) => {
      clearTimeout(timeoutId)
      cleanup()
      resolve(data)
    }

    const queryString = new URLSearchParams({
      ...params,
      cb: callbackName,
    }).toString()

    script.src = `${url}?${queryString}`
    script.onerror = () => {
      clearTimeout(timeoutId)
      cleanup()
      reject(new Error(`JSONP request failed: ${url}`))
    }

    document.head.appendChild(script)
  })
}
