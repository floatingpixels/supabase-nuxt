import { config } from 'dotenv'
import { createSeedClient } from '@snaplet/seed'
import { copycat } from '@snaplet/copycat'
import { createClient } from '@supabase/supabase-js'

const seed = await createSeedClient()
config({ path: './playground/.env' })

async function main() {
  await seed.$resetDatabase()
  await createUsers(10)
  await createData()
  process.exit()
}

async function createData() {
  await seed.posts(x => x(10, { comments: x => x({ min: 1, max: 5 }) }), { connect: { members: seed.$store.members } })
}

async function createUsers(n: number = 1) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
  const PASSWORD = 'password'

  const users = [] as { id: string }[]

  for (let i = 0; i <= n; i++) {
    const index = i + 1
    const email = 'user' + index + '@example.com'
    const user_name = 'user' + index
    const first_name = copycat.firstName(i)
    const last_name = copycat.lastName(i)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: PASSWORD,
      options: {
        data: {
          user_name,
          first_name,
          last_name,
        },
      },
    })
    if (error) {
      console.error('error', error)
      return error
    }
    if (data?.user) users.push(data.user)
  }

  await seed.members(x => x(users.length, ({ index }) => ({ username: `user${index}`, user_id: users[index].id })))

  return users
}

main()
