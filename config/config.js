module.exports={
  "facebook_api_key"      :     "FB APP ID",
  "facebook_api_secret"   :     "FB API SECRET",
  "callback_url"          :     "http://localhost:3000/auth/facebook/callback",
  "use_database"          :     "true",
  databaseURL: process.env.DATABASE_URL || "postgres://@127.0.0.1:5432/nwsbus"

}
