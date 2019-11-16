# == Schema Information
#
# Table name: national_governing_bodies
#
#  id           :bigint(8)        not null, primary key
#  acronym      :string
#  country      :string
#  image_url    :string
#  name         :string           not null
#  player_count :integer          default(0), not null
#  website      :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

# Data model for NationalGoverningBodies, currently only used for Referees to assign for themselves and users to search
# based this association
class NationalGoverningBody < ApplicationRecord
  has_many :referee_locations, dependent: :destroy
  has_many :referees, through: :referee_locations
  has_many :certified_referees, -> { certified }, through: :referee_locations, source: :referee
  has_many :teams, dependent: :destroy
  has_many :stats, inverse_of: :national_governing_body, class_name: 'NationalGoverningBodyStat', dependent: :destroy
  has_many :social_accounts, as: :ownable, dependent: :destroy
end
