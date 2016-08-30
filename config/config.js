module.exports={
  "facebook_api_key"      :     "173240016435994",
  "facebook_api_secret"   :     "857a160d6ef842cf7af72bcf9d547e00",
  "callback_url"          :     "https://nswbus-pr-2.herokuapp.com/auth/facebook/callback",
  "use_database"          :     "true",
  databaseURL: process.env.DATABASE_URL || "postgres://@127.0.0.1:5432/nwsbus"
}
