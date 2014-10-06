require 'sinatra'

class Renzu::App < Sinatra::Application
  configure :development do |c|
    c.set :bind, '10.10.10.10'
    puts c.bind
  end
end

