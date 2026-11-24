import * as migration_20261116_110840_initial from './20261116_110840_initial'
import * as migration_20261116_133625_partnership_children from './20261116_133625_partnership_children'
import * as migration_20261116_140900_birth_surname from './20261116_140900_birth_surname'
import * as migration_20261116_141312_current_residence from './20261116_141312_current_residence'
import * as migration_20261116_151815_family_accounts from './20261116_151815_family_accounts'
import * as migration_20261116_180458_partnership_titles from './20261116_180458_partnership_titles'
import * as migration_20261116_183436_person_portraits from './20261116_183436_person_portraits'
import * as migration_20261116_185823_separate_avatar_photo from './20261116_185823_separate_avatar_photo'
import * as migration_20261118_123225_gebeurtenissen from './20261118_123225_gebeurtenissen'
import * as migration_20261118_205605_website_instellingen from './20261118_205605_website_instellingen'
import * as migration_20261124_155805_private_blob_storage from './20261124_155805_private_blob_storage'

export const migrations = [
  {
    up: migration_20261116_110840_initial.up,
    down: migration_20261116_110840_initial.down,
    name: '20261116_110840_initial',
  },
  {
    up: migration_20261116_133625_partnership_children.up,
    down: migration_20261116_133625_partnership_children.down,
    name: '20261116_133625_partnership_children',
  },
  {
    up: migration_20261116_140900_birth_surname.up,
    down: migration_20261116_140900_birth_surname.down,
    name: '20261116_140900_birth_surname',
  },
  {
    up: migration_20261116_141312_current_residence.up,
    down: migration_20261116_141312_current_residence.down,
    name: '20261116_141312_current_residence',
  },
  {
    up: migration_20261116_151815_family_accounts.up,
    down: migration_20261116_151815_family_accounts.down,
    name: '20261116_151815_family_accounts',
  },
  {
    up: migration_20261116_180458_partnership_titles.up,
    down: migration_20261116_180458_partnership_titles.down,
    name: '20261116_180458_partnership_titles',
  },
  {
    up: migration_20261116_183436_person_portraits.up,
    down: migration_20261116_183436_person_portraits.down,
    name: '20261116_183436_person_portraits',
  },
  {
    up: migration_20261116_185823_separate_avatar_photo.up,
    down: migration_20261116_185823_separate_avatar_photo.down,
    name: '20261116_185823_separate_avatar_photo',
  },
  {
    up: migration_20261118_123225_gebeurtenissen.up,
    down: migration_20261118_123225_gebeurtenissen.down,
    name: '20261118_123225_gebeurtenissen',
  },
  {
    up: migration_20261118_205605_website_instellingen.up,
    down: migration_20261118_205605_website_instellingen.down,
    name: '20261118_205605_website_instellingen',
  },
  {
    up: migration_20261124_155805_private_blob_storage.up,
    down: migration_20261124_155805_private_blob_storage.down,
    name: '20261124_155805_private_blob_storage',
  },
]
