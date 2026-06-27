import { type FastifyPluginAsync } from 'fastify'

const performances: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { performances: []}
  })
}

export default performances
