from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Load files
movies = pickle.load(open('models/movies.pkl', 'rb'))
model = pickle.load(open('models/model.pkl', 'rb'))
vectors = pickle.load(open('models/vectors.pkl', 'rb'))


def recommend(movie):

    movie = movie.lower()

    matches = movies[movies['title'].str.lower() == movie]

    if matches.empty:
        return []

    movie_index = matches.index[0]

    distances, indices = model.kneighbors(
        [vectors[movie_index]],
        n_neighbors=6
    )

    recommended_movies = []

    for i in indices[0][1:]:

        recommended_movies.append(
            movies.iloc[i].title
        )

    return recommended_movies


@app.route('/')
def home():
    return jsonify({
        "message": "Movie Recommendation Backend is Running 🚀"
    })


@app.route('/recommend', methods=['POST'])
def recommend_movies():

    data = request.json

    movie_name = data['movie']

    recommendations = recommend(movie_name)

    return jsonify(recommendations)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
