var express = require("express");
var router = express.Router();
const DButils = require("../utils/DButils");
const utils = require("../utils/search_recipe");
//const axios = require("axios");
//const api_domain = "https://api.spoonacular.com/recipes";

router.use(function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM dbo.users")
      .then((users) => {
        if (users.find((x) => x.user_id === req.session.user_id)) {
          req.user_id = req.session.user_id;
        }
        next();
      })
      .catch((error) => next(error));
  } else {
    next();
  }
});

router.use(function requireLogin(req, res, next) {
  if (!req.user_id) {
    next({ status: 401, message: "unauthorized" });
  } else {
    next();
  }
});

router.get("/recipeInfo/:ids", async (req, res, next) => {
  try {
    const id = req.params.ids;
    const watchedRecipesArr = await DButils.execQuery(
      `SELECT watched_recipes FROM dbo.users WHERE user_id = '${req.user_id}'`
    );
    let splitedWatched = watchedRecipesArr[0]; //.favorite_recipse;//.split(",");
    splitedWatched = Object.values(splitedWatched);
    // splited= JSON.stringify(splited);
    splitedWatched = splitedWatched[0].split(",");
    splitedWatched.pop();
    const favoriteRecipesArr = await DButils.execQuery(
      `SELECT favorite_recipes FROM dbo.users WHERE user_id = '${req.user_id}'`
    );
    let splitedfavorite = favoriteRecipesArr[0]; //.favorite_recipse;//.split(",");
    splitedfavorite = Object.values(splitedfavorite);
    // splited= JSON.stringify(splited);
    splitedfavorite = splitedfavorite[0].split(",");
    splitedfavorite.pop();
    recipeDetails = {
      watched: splitedWatched.includes(id),
      saved: splitedfavorite.includes(id),
    };

    res.send({ recipeDetails });
  } catch (error) {
    next(error);
  }
});

router.post("/familyRecipes", async (req, res, next) => {
  try {
    const recipeIngredients = JSON.stringify(req.body.ingredients);
    //const recipeIngrename=Object.keys(recipeIngre[0]);
    await DButils.execQuery(
      `INSERT INTO dbo.family_recipes VALUES (default,'${req.user_id}','${req.body.recipe_name}','${req.body.recipe_owner}','${req.body.in_event}','${recipeIngredients}','${req.body.instructions}');`
    );
    res.send({ sucess: true });
  } catch (error) {
    next(error);
  }
});

router.get("/familyRecipes", async (req, res, next) => {
  try {
    const familyRecipse = await DButils.execQuery(
      `SELECT * FROM dbo.family_recipes where user_id = '${req.user_id}'`
    );

    const familyRecipseP = familyRecipse.map((recipe) => {
      return {
        recipe_id: recipe.recipe_id,
        title: recipe.recipe_name,
        recipe_owner: recipe.recipe_owner,
        InEvent: recipe.in_event,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: recipe.instructions,
      };
    });
    res.send(familyRecipseP);
  } catch (error) {
    next(error);
  }
});

router.get("/personalRecipes", async (req, res, next) => {
  try {
    const personalRecipes = await DButils.execQuery(
      `SELECT * FROM dbo.recipes where user_id = '${req.user_id}'`
    );

    const personalRecipesP = personalRecipes.map((recipe) => {
      return {
        recipe_id: recipe.recipe_id,
        title: recipe.name,
        image: recipe.image_URL,
        readyInMinutes: recipe.preparation_time,
        like: recipe.likes,
        vegan: recipe.vegan,
        vegetarian: recipe.vegetarian,
        gluttenfree: recipe.glutten_free,
        ingredients: JSON.parse(recipe.ingredients),
        instructions: recipe.instructions,
        dishes_number: recipe.dishes_number,
      };
    });
    res.send(personalRecipesP);
  } catch (error) {
    next(error);
  }
});

router.post("/personalRecipes", async (req, res, next) => {
  try {
    const recipeIngredients = JSON.stringify(req.body.ingredients);
    //const recipeIngrename=Object.keys(recipeIngre[0]);
    await DButils.execQuery(
      `INSERT INTO dbo.recipes VALUES (default,'${req.user_id}','${req.body.recipe_name}','${req.body.image_URL}','${req.body.preparation_time}','${req.body.likes}','${req.body.vegan}','${req.body.glutten_free}','${recipeIngredients}','${req.body.instructions}','${req.body.dishes_number}','${req.body.vegetarian}');`
    );
    res.send({ sucess: true });
  } catch (error) {
    next(error);
  }
});

router.get("/favoriteRecipes", async (req, res, next) => {
  try {
    const arr = await DButils.execQuery(
      `SELECT favorite_recipes FROM dbo.users where user_id = '${req.user_id}'`
    );

    let splited = arr[0];
    splited = Object.values(splited);
    splited = splited[0].split(",");
    splited.pop();

    let recipes = await Promise.all(
      splited.map((recipe_raw) => {
        return utils.getRecipeInfo(parseInt(recipe_raw, 10));
      })
    );
    recipes = recipes.map((recipe) => recipe.data);
    res.send(recipes);
  } catch (error) {
    next(error);
  }
});

router.put("/favoriteRecipes", async (req, res, next) => {
  try {
    let newRecipe = req.query.recipe_id;
    let lastRecipes = await DButils.execQuery(
      `SELECT favorite_recipes FROM dbo.users WHERE user_id = '${req.user_id}'`
    );
    let arr = [newRecipe, lastRecipes[0].favorite_recipes];

    await DButils.execQuery(
      `UPDATE dbo.users Set favorite_recipes =CAST('${arr}' AS varchar) WHERE user_id = '${req.user_id}'`
    );
    res.send({ sucess: true });
  } catch (error) {
    next(error);
  }
});

router.get("/watchedRecipes", async (req, res, next) => {
  try {
    const arr = await DButils.execQuery(
      `SELECT watched_recipes FROM dbo.users where user_id = '${req.user_id}'`
    );

    let splited = arr[0];
    splited = Object.values(splited);
    splited = splited[0].split(",");
    splited.pop();
    splited = [...new Set(splited)];
    splited = splited.slice(0, 3);

    let recipes = await Promise.all(
      splited.map((recipe_raw) => {
        return utils.getRecipeInfo(parseInt(recipe_raw, 10));
      })
    );
    recipes = recipes.map((recipe) => recipe.data);
    res.send(recipes);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
