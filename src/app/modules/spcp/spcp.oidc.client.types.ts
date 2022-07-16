import { KeyObject } from 'crypto'
import { JWK } from 'jose'
import { Options } from 'node-cache'
import { BaseClient } from 'openid-client'

type PublicJwk = Partial<JWK> & Required<Pick<JWK, 'use' | 'kid'>>

type SecretJwk = PublicJwk & {
  d: string
}

export type PublicJwks = {
  keys: PublicJwk[]
}
export type SecretJwks = {
  keys: SecretJwk[]
}

// Object returned when cache calls refresh
export type Refresh = {
  ndiPublicKeys: CryptoKeys
  baseClient: BaseClient
}

// Object with jwks converted to a crypto KeyObject
export type CryptoKey = {
  kid: string
  use: string
  alg?: string
  key: KeyObject // Converted jwks
}

export type SigningKey = Required<CryptoKey>

export type CryptoKeys = CryptoKey[]

export type SpcpOidcBaseClientConstructorParams = {
  rpClientId: string
  rpRedirectUrl: string
  ndiDiscoveryEndpoint: string
  ndiJwksEndpoint: string
  rpSecretJwks: SecretJwks
  rpPublicJwks: PublicJwks
}

export type SpOidcClientConstructorParams = {
  spOidcRpClientId: string
  spOidcRpRedirectUrl: string
  spOidcNdiDiscoveryEndpoint: string
  spOidcNdiJwksEndpoint: string
  spOidcRpSecretJwks: SecretJwks
  spOidcRpPublicJwks: PublicJwks
}

export type SpcpOidcBaseCilentCacheConstructorParams = {
  options?: Options
  ndiDiscoveryEndpoint: string
  ndiJwksEndpoint: string
  rpClientId: string
  rpRedirectUrl: string
  rpSecretJwks: SecretJwks
}

export type ParsedSub = {
  key: string
  value: string
}[]
