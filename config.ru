require_relative "./app.rb"

map "/" do
  run Renzu::App
end
