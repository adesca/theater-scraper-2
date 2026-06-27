import { type FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/2', async function (request, reply) {
    return { root: true }
  })
}

export default root
