import {flags} from '@oclif/command'
import cli from 'cli-ux'
import {APIClientService} from '../../share/api/api.service'
import {AbstractCommand} from '../../share/abstract.command'

export default class Detach extends AbstractCommand {
  static description = 'Domain detach command'

  static examples = [
    '$ shifter domain:detach --username USERNAME --password PASSWORD --site-id xxx-YOUR-SITE-ID-xxxx  --domain test.example.com',
  ]

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    development: flags.boolean({
      description: 'Work as development mode (Only for Shifter developer team)',
      default: false,
    }),
    verbose: flags.boolean({
      description: 'Show verbose',
      default: false,
    }),
    username: flags.string({
      char: 'U',
      description: 'Shifter username',
    }),
    password: flags.string({
      hidden: true,
      char: 'P',
      description: 'Shifter password',
    }),
    domain: flags.string({
      char: 'D',
      description: 'Target domain name (eg. www.example.com)',
    }),
    'site-id': flags.string({
      char: 'S',
      description: 'Shifter site id',
    }),
    'no-shifter-cdn': flags.boolean({
      description: 'If you using another CDN like Netlify or own CloudFront etc... Please set the flag.',
      default: false,
    }),
  }

  async run() {
    const {flags} = this.parse(Detach)
    const siteId = flags['site-id'] || await cli.prompt('Site id')
    const domain = flags.domain || await cli.prompt('Target domain')
    const development = flags.development === true
    const noShifterCDN = flags['no-shifter-cdn'] === true
    if (development) this.log('Work as development mode')
    try {
      const clientWithAuth = await this.setupApiClient(flags.username, flags.password, flags.verbose, development)
      const site = await clientWithAuth.get(`/latest/sites/${siteId}`)
      if (!site || site.project_id !== siteId) throw new Error(`No such site ${siteId}`)
      const domainObj = await clientWithAuth.get(`/latest/sites/${siteId}/domains/${domain}`)
      if (!domainObj) throw new Error(`No such domain ${domain}`)
      if (domainObj.status !== 'ISSUED') throw new Error('The domain has not been veritied. Please wait for a while and try again.')
      await clientWithAuth.post(`/latest/sites/${siteId}/domains/${domain}/detach`, {
        use_shifter_domain: !noShifterCDN,
      })
      this.log('Domain has been detached')
    } catch (error) {
      if (APIClientService.isAxiosError(error) && error.response) {
        const response = error.response
        // eslint-disable-next-line  no-console
        if (development) console.log(response)
        this.error(`${response.status} - ${response.statusText}\n${response.data.message}`)
      }
      // eslint-disable-next-line  no-console
      if (development) console.log(error)
      this.error(error)
    }
  }
}
