import { stdin, stdout } from 'node:process'
export async function promptPassword(
  label = 'Wachtwoord (minimaal 14 tekens, invoer verborgen): ',
): Promise<string> {
  // Read password without echoing it or storing it in shell history.
  stdout.write(label)
  return await new Promise<string>((resolve, reject) => {
    if (!stdin.isTTY) return reject(new Error('Gebruik een interactieve terminal.'))
    let text = ''
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          stdin.setRawMode(false)
          process.exit(130)
        }
        if (char === '\r' || char === '\n') {
          stdin.off('data', onData)
          stdin.setRawMode(false)
          stdin.pause()
          stdout.write('\n')
          return resolve(text)
        }
        if (char === '\u007f') text = text.slice(0, -1)
        else text += char
      }
    }
    stdin.on('data', onData)
  })
}
