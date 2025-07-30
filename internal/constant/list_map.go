package constant

// Map represents a game map with metadata
type Map struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Difficulty  string `json:"difficulty"` // "easy", "medium", "hard"
	Category    string `json:"category"`   // "tutorial", "code", "config", "mixed", "vim"
	TextPattern string `json:"text_pattern"`
}

// GAME_MAPS contains all available maps with metadata
var GAME_MAPS = []Map{
	{
		ID:          1,
		Name:        "Song about basic movement",
		Description: "Perfect for beginners - learn basic hjkl movements",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `I practice h,j,k,l everyday !
I forget about the arrow !
I forget about the mouse !
And i drink a bubble tea !
I practice h,j,k,l everyday !
I forget about the arrow !
And i drink a oolong tea !`,
},
	{
		ID:          2,
		Name:        "Word jumping story",
		Description: "Learn w, b, e and W, B, E movements",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `Give me a w,
b em a eviG,
Give me a W,
E em a eviG,
Give me a e, give me a b !
eviG em a eg dna a Eg !
Yeah yeah yeah !
I deserve a bubble tea !`,
},
	{
		ID:          3,
		Name:        "Search motion Dunning-Kruger",
		Description: "Master f, F, t, T and repeat with ; and ,",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `Search motion is amazing, i love it.
I can go wherever i want, 
When i want. 
I just pressed my search motion,
Shot my target caracter. Boom.
Then in my buffer, i can use , or ;
Try on to target e and play
eh ! eh ! eh ! e ee e e e e ee  e e e e e e ah ah !
Nothing scare me now i
Know search motion.
Vim phd is in my pocket soon.`,
},
	{
		ID:          4,
		Name:        "What the ???",
		Description: "Learn 0, $, G, gg and sentence movement with ( )",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `I can definitely do ) for something .
What about ( ? hmmmm. Maybe gg ?
2G ? 
To be or not to be ? 
Is question the that. I would give a shot 
To $ maybe. To 0 maybe.
Maybe one day, i'm tired of vim now.`,
},
	{
		ID:          5,
		Name:        "paragraph brainfuck",
		Description: "Master }, {, % for paragraph and bracket navigation",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `There is definitely something to do

But i'm stock

I dont like paragraph. I wish i could jump until them.

Aaaaah i give up, let's have a bubble milk tea.`,
},
	{
		ID:          6,
		Name:        "The bracket boba story",
		Description: "Complete the tutorial with g_, H, M, L movements",
		Difficulty:  "tutorial",
		Category:    "tutorial",
		TextPattern: `      What did i miss now ?       
Why so much    space                   fuu            
         Help.        Help.        Help.    
Give me a bracket to jump.
Function Help    {
Int boba, char *tapioca, char *milk)
Boba = 1;
         Tapioca = "lot please";       
Milk =  "lot please";
   if(Boba == 1 && tapioca == "lot please" &&
Milk = "lot please")
{
Return int buble_milk_tea = (SUCESS);
}
Else
{
Return ":'(";
} Return (never);`,
},
	{
		ID:          7,
		Name:        "First Steps",
		Description: "Easy Easy",
		Difficulty:  "easy",
		Category:    "practice",
		TextPattern: `Easy hjkl
Easy wbWb
Easy FtfT
Easy Easy
Hard (){}`,
},
	{
		ID:          8,
		Name:        "Boba cross",
		Description: "EXTRA PEARL EXTRA JOY",
		Difficulty:  "easy",
		Category:    "practice",
		TextPattern: `            Pearls in the pocket.
            Vim stirs the tea.
            Uncle Boba nods.
            Sugar = 9999.
BOBA STOP EXTRA PEARLS MAPPING :TASTE TO :JOY LESS
BOBA STOP EXTRA PEARLS MAPPING :TASTE TO :JOY LESS
BOBA STOP EXTRA PEARLS MAPPING :TASTE TO :JOY LESS
            Escape with flavor.
            Insert mode: bubble.
            Call Uncle Boba.`,},
	{
		ID:          9,
		Name:        "What is boba",
		Description: "Master quick character searches",
		Difficulty:  "easy",
		Category:    "practice",
		TextPattern: `What is Boba?
Often synonymous with bubble tea, 
Boba is actually the little black balls that sink 
to the bottom of your bubble tea.
Boba pearls are made from partially cooked tapioca flour 
- the refined starch extracted from the 
cassava root. Boba is gluten-free and,
in its natural state, flavorless. 
Loved for its chewy texture, 
Boba can be added to both hot and cold drinks including hot teas or smoothies.`,
	},
	{
		ID:          10,
		Name:        "Big boba cross",
		Description: "EXTRA PEARLS LESS CODE",
		Difficulty:  "medium",
		Category:    "code",
		TextPattern: `            Tapioca in the soul.
            Pearls in the pocket.
            Brew it with style.
            Vim is my blender.
            Uncle Boba approves
            Bubble up the drama.
            Leader key is tea.
            We don't talk about Nano.
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
BOBA STOP EXTRA PEARLS LESS CODE MORE CREAM
            Bubble tea or bust.
            Pearls don't lie.
            Slurp responsibly.
            Every sip is a motion.
            Call Uncle Boba.
            Vim the beverage.
            Tapioca forever.
            Boba is love.`,
	},
	{
		ID:          11,
		Name:        "Vim Commands Guide",
		Description: "Learn vim by reading about vim movements",
		Difficulty:  "medium",
		Category:    "vim",
		TextPattern: `# Vim Motions Guide
## Basic Movement
- h: move left
- j: move down  
- k: move up
- l: move right
## Word Movement
- w: next word beginning
- b: previous word beginning
- e: end of word
## Line Movement
- 0: start of line
- $: end of line
- ^: first non-blank character
- g_: last non-blank character
## File Movement
- gg: top of file
- G: bottom of file`,
	},
	{
		ID:          12,
		Name:        "Warlock",
		Description: "let's meet Warlock",
		Difficulty:  "medium",
		Category:    "config",
		TextPattern: `class Warlock
{
private:
	std::string name;
	std::string title;
	SpellBook spellBook;
	Warlock();
	Warlock(Warlock const &other);
	Warlock &operator=(Warlock const &other);
public:
	Warlock(std::string const &name, std::string const &title);
	virtual ~Warlock();
	std::string const &getName(void) const;
	std::string const &getTitle(void) const;
	void setTitle(std::string const &title);
void introduce(void) const;
	void learnSpell(ASpell *spell);
	void forgetSpell(std::string const &spellName);
	void launchSpell(std::string const &spellName, ATarget const &target);
};
`,
	},
	{
		ID:          13,
		Name:        "World map",
		Description: "Navigate the world",
		Difficulty:  "medium",
		Category:    "code",
		TextPattern: `#define screenWidth 640
#define screenHeight 480
#define texWidth 64
#define texHeight 64
#define mapWidth 24
#define mapHeight 24
int worldMap[mapWidth][mapHeight]=
{
  {4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,7,7,7,7,7,7,7,7},
  {4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7},
  {4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7},
  {4,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7},
  {4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7},
  {4,0,4,0,0,0,0,5,5,5,5,5,5,5,5,5,7,7,0,7,7,7,7,7},
  {4,0,5,0,0,0,0,5,0,5,0,5,0,5,0,5,7,0,0,0,7,7,7,1},
  {4,0,6,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8},
  {4,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,1},
  {4,0,8,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8},
  {4,0,0,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,7,7,7,1},
  {4,0,0,0,0,0,0,5,5,5,5,0,5,5,5,5,7,7,7,7,7,7,7,1},
  {6,6,6,6,6,6,6,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6},
  {8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4},
  {6,6,6,6,6,6,0,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6},
  {4,4,4,4,4,4,0,4,4,4,6,0,6,2,2,2,2,2,2,2,3,3,3,3},
  {4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2},
  {4,0,0,0,0,0,0,0,0,0,0,0,6,2,0,0,5,0,0,2,0,0,0,2},
  {4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2},
  {4,0,6,0,6,0,0,0,0,4,6,0,0,0,0,0,5,0,0,0,0,0,0,2},
  {4,0,0,5,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2},
  {4,0,6,0,6,0,0,0,0,4,6,0,6,2,0,0,5,0,0,2,0,0,0,2},
  {4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2},
  {4,4,4,4,4,4,4,4,4,4,1,1,1,2,2,2,2,2,2,3,3,3,3,3}
};`,
	},
{
	ID:          14,
	Name:        "Boba Mold",
	Description: "A mysterious virus... or just expired tapioca?",
	Difficulty:  "hard",
	Category:    "mixed",
	TextPattern: `Day 1: Someone sneezed in the tea shop.
Day 2: Boba pearls start moving by themselves.
Day 3: Uncle Boba says it's "extra fresh".
Day 4: No one leaves alive. 
Day 5: Too late. The mold speaks. It wants... sugar.
"Drink me", the cup says. "Become one of us."
Goodbye humanity. Hello Boba Mold.`,
},
{
	ID:          15,
	Name:        "Text Maze",
	Description: "Decode this broken maze of letters",
	Difficulty:  "hard",
	Category:    "mold",
	TextPattern: `wl
ri
ik
te
tt
eh
na
 t
This is not random.
Look closely.`,
},
{
	ID:          16,
	Name:        "The Bracket Jungle",
	Description: "A forest of brackets and forgotten functions",
	Difficulty:  "hard",
	Category:    "code",
	TextPattern: `voidexplore(){
if(you.are("brave")){
map:=[{"Start"},{"Lost"},{"Exit"}];
func(){
log("Enteringbracketjungle...");
consttraps=[{danger:true},{safe:false}];
for(leti=0;i<traps.length;i++){
if(traps[i].danger){
console.warn("Watchout!");
}
}
}();
while(true){
decision:=(player)=>{
return(player.hp>0)?"advance":"retreat";
};
if(decision(hero)=="retreat"){
break;
}
}
notes:=[
{clue:"lookforclosing}"},
{clue:"don'tgetlostin[]"},
{clue:"sometimes()hidesecrets"}
];
callHome({with:["tears","boba",":",")"]});`,
},
	{
		ID:          17,
		Name:        "Inception",
		Description: "Docker Docker",
		Difficulty:  "hard",
		Category:    "code",
		TextPattern: `version: '3.7'
services:
  nginx:
    container_name: nginx
    networks:
      - inception
    depends_on:
      wordpress:
        condition: service_started
    build: ./requirements/nginx
    image: nginx:notlatest
    env_file: .env
    volumes:
      - wordpress:/var/www/wordpress
    restart: always
    ports:
      - "443:443"
  wordpress:
    container_name: wordpress
    networks:
      - inception
    depends_on:
      mariadb:
        condition: service_healthy
    build: ./requirements/wordpress
    image: wordpress:notlatest
    env_file: .env
    volumes:
      - wordpress:/var/www/wordpress
    restart: always
    expose:
      - "9000"
  mariadb:
    container_name: mariadb
    networks:
      - inception
    build: ./requirements/mariadb
    image: mariadb:notlatest
    env_file: .env
    volumes:
      - mariadb:/var/lib/mysql
    restart: always
    expose:
      - "3306"
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 30s
volumes:
  mariadb:
    driver: local
    driver_opts:
      type: none
      device: /home/ftapponn/data/mariadb
      o: bind
  wordpress:
    driver: local
    driver_opts:
      type: none
      device: /home/ftapponn/data/wordpress
      o: bind
networks:
  inception:
    name: inception
    driver: bridge
	}`,
	},
	{
		ID:          18,
		Name:        "Boba python",
		Description: "Practice with database queries and commands",
		Difficulty:  "hard",
		Category:    "code",
		TextPattern: `import random, time

def boba_greeting():
    boba_names = ["Boba the Brave", "Boba the Blobby", "Boba the Bizarre", "Boba the Bouncer"]
    chosen_boba = random.choice(boba_names)
    print(f"Hi there, I'm {chosen_boba}! Welcome to my bubble adventure...")
    return chosen_boba

def boba_battle(boba_hero):
    boba_enemies = ["Evil Black Tea", "Tapioca Terror", "Condensed Milk Menace"]
    boba_enemy = random.choice(boba_enemies)
    print(f"{boba_hero} encounters the dreaded {boba_enemy}!")
    boba_power = random.randint(1, 10)
    enemy_power = random.randint(1, 10)
    time.sleep(1)
    print(f"{boba_hero} uses the power of sweetness (power {boba_power})")
    print(f"{boba_enemy} attacks with bitterness (power {enemy_power})")
    if boba_power > enemy_power:
        print(f"{boba_hero} defeats {boba_enemy} with a burst of bubbles!")
        return True
    else:
        print(f"{boba_hero} was slurped into a cosmic straw...")
        return False

def boba_bonus():
    boba_loot = ["a turbo straw", "a caramel shield", "a mochi helmet"]
    boba_reward = random.choice(boba_loot)
    print(f"Bonus unlocked: {boba_reward}!")

def boba_adventure():
    boba_hero = boba_greeting()
    for boba_stage in range(3):
        print(f"Stage {boba_stage + 1} of the Boba Journey")
        if boba_battle(boba_hero): boba_bonus()
        else:
            print("The adventure ends... but Boba will bubble again!")
            break
    else: print(f"{boba_hero} became a dessert legend!")

if __name__ == "__main__":
    boba_adventure()`,
	},
	{
		ID:          19,
		Name:        "Push swap 42",
		Description: "Welcome to 42",
		Difficulty:  "hard",
		Category:    "mixed",
		TextPattern: `/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   launch_action.c                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: ftapponn <ftapponn@student.42heilbronn.de  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/11/21 15:02:28 by ftapponn          #+#    #+#             */
/*   Updated: 2024/11/21 16:10:36 by ftapponn         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "../../../includes/push_swap.h"

void	handle_double_rotations(t_push_list *element, t_push_list **list_sa,
		t_push_list **list_sb)
{
	while (element->rrr > 0)
	{
		action_rrr(list_sa, list_sb);
		element->rrr--;
	}
	while (element->rr > 0)
	{
		action_rr(list_sa, list_sb);
		element->rr--;
	}
}

void	handle_rotations_a(t_push_list *element, t_push_list **list_sa)
{
	while (element->rra > 0)
	{
		action_rra(list_sa, 0);
		element->rra--;
	}
	while (element->ra > 0)
	{
		action_ra(list_sa, 0);
		element->ra--;
	}
}

void	handle_rotations_b(t_push_list *element, t_push_list **list_sb)
{
	while (element->rrb > 0)
	{
		action_rrb(list_sb, 0);
		element->rrb--;
	}
	while (element->rb > 0)
	{
		action_rb(list_sb, 0);
		element->rb--;
	}
}

void	launch_action(t_push_list *element, t_push_list **list_sa,
		t_push_list **list_sb)
{
	handle_double_rotations(element, list_sa, list_sb);
	handle_rotations_a(element, list_sa);
	handle_rotations_b(element, list_sb);
	action_pb(list_sa, list_sb);
}
`,
	},
}

// TEXT_PATTERNS maintains backward compatibility
func init() {
	// Dynamically build TEXT_PATTERNS from GAME_MAPS to avoid index issues
	TEXT_PATTERNS = make([]string, len(GAME_MAPS))
	for i, gameMap := range GAME_MAPS {
		TEXT_PATTERNS[i] = gameMap.TextPattern
	}
}

var TEXT_PATTERNS []string

// GetMapByID returns a map by its ID
func GetMapByID(id int) *Map {
	for _, gameMap := range GAME_MAPS {
		if gameMap.ID == id {
			return &gameMap
		}
	}
	return nil
}

// GetMapsByDifficulty returns maps filtered by difficulty
func GetMapsByDifficulty(difficulty string) []Map {
	var filtered []Map
	for _, gameMap := range GAME_MAPS {
		if gameMap.Difficulty == difficulty {
			filtered = append(filtered, gameMap)
		}
	}
	return filtered
}

// GetMapsByCategory returns maps filtered by category
func GetMapsByCategory(category string) []Map {
	var filtered []Map
	for _, gameMap := range GAME_MAPS {
		if gameMap.Category == category {
			filtered = append(filtered, gameMap)
		}
	}
	return filtered
}
