require 'sinatra'
require 'json'
require_relative './renzu/get_graphs.rb'
enable :sessions

class Renzu::App < Sinatra::Application
  get '/' do
    send_file 'index.html'
  end
  run! if app_file == $0
end
