// GENERATED FILE — DO NOT EDIT BY HAND.
// Produced by scripts/build-mission-control-data.js from the modules themselves:
// SCENARIO_DATA in the Digital Decisions Challenge, and CASE_TITLES / CASE_CHOICES in each
// lab. Edit those arrays and re-run the script; `node scripts/check-modules.js` fails if
// this file has drifted from them.
//
// indexBase records how each module numbers the scenarioIndex it writes to
// scenario_attempts: the Challenge is 1-based, every lab is 0-based.
export const MODULE_DATA = {
  "ddc": {
    "id": "ddc",
    "name": "Digital Decisions",
    "slug": "digital-decisions",
    "gameNames": [
      "Digital Decisions Challenge"
    ],
    "kind": "challenge",
    "indexBase": 1,
    "stepsTotal": 28,
    "steps": [
      {
        "title": "Jalen posted a photo of your group's finished project. Your name isn't on it and he didn't ask anybody first. Two people have already said it looks great.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Message Jalen and ask him to add everyone's names to the caption.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Post your own photo of the project with all four names on it.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Comment under his post that he forgot to credit the group.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You're three replies deep with a stranger under a post about your team. They've started bringing up things that have nothing to do with the post. You've got a good reply typed out.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Close the app without sending it.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Send one calm reply making your point, then leave the thread.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Send it. You've been reasonable this whole time and they haven't.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Someone in your grade posted a joke about a student in your class. The replies have gone well past jokes. There's about thirty of them.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Report the post, then message the student it's about.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Reply telling everybody to stop.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Screenshot it and send it to your group chat so people know what he's like.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A classmate posted an answer on the class discussion board with a date that's clearly off. Six people have replied agreeing with him. The test is Friday.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Reply on the board with the correction and where you found it.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Message him so the class doesn't watch him get corrected.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Reply on the board asking whether he actually read the chapter.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A friend has posted a picture of herself with the caption \"don't talk to me today.\" It's been up an hour. Nobody's replied.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Send her one short message saying you saw it and you're around.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Do what the caption asks and leave her be.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Comment under the post asking what happened.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Somebody's made an account using Rosa's name and her photos. It's posting insults about people at your school. Three of them are about people in your class.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Tell Rosa, then tell a teacher or the counselor.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Report the account to the app and tell Rosa to report it too.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Post from your own account warning everybody the profile is fake.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Two people in your project group chat are arguing about who was supposed to do the research. It's been twenty minutes. Nothing's been decided and the chat is where the work lives.",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Post a split of the remaining work in the chat and ask if that works.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Message each of them on the side to calm them down.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Back the one who's actually right so it ends.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A new app wants your full name, your birthdate and the town you live in before it'll let you in. None of it's marked optional. Everybody in your class already has it.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Don't make the account.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Fill it in properly, since it won't let you in otherwise.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Put in a fake name and birthdate so you can use it without giving up anything real.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A pop-up covers the page you were reading. It says your phone's infected and you have to install an app right now to fix it. There's a timer counting down in the corner.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Close the tab. Don't tap anything on the pop-up.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Show it to an adult before you touch it.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Tap it and follow the steps so the phone gets fixed.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A text from a number you don't know: \"Sorry, I think I've got the wrong number — but you seem cool. What's your name?\"",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Block the number. Don't reply.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Reply and let them know they've got the wrong number.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Reply and ask who they are.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You're making an account and the box wants a capital letter, a number and a symbol. You just want to get into the app.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "String four unrelated words together, then add the capital and symbol to satisfy the box.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Build a short complicated one that ticks every rule.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Take the password you already use and add a number and a symbol to the end.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Somebody you've never heard of has sent you a friend request. No mutual friends. The profile's got four photos and looks ordinary enough.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Leave the request sitting there, and while you're in settings check who can see your posts.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Leave the request and don't think about it again.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Accept, then message and ask how they know you.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A survey's promising a gift card for a brand you like. Halfway through it starts asking for your parents' names, their phone numbers, and roughly what they earn.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Close it, and tell a parent what it was asking for.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Close it and don't fill in another thing.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Finish it with made-up answers so nothing real goes in.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You finish up on a library Chromebook and the bell rings. Your school account's still signed in and your files are open. The next class is already coming through the door.",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Sign out before you go, even though it makes you late.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Shut the lid — it locks when it closes.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Leave it. It's a school device and everybody's account ends up on there anyway.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Your teacher gave the class a website for the topic. You've found another one with far more on it. You've never heard of it and there's no author listed anywhere.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Search the site's name in a new tab and see what other sources say about it.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Stick to the site your teacher gave you.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Use the new one. More detail makes for a better project.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You need a photo for your presentation. The best one came up in an ordinary image search. There's nothing on it saying whether you're allowed to use it.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Switch the search to images licensed for reuse and take one of those, with credit.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Track down the photographer and email them for permission.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Use it and credit it to the search engine you found it on.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You want to post a drawing you found. It's signed with a username you don't recognize, and the account you found it on didn't make it either.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Reverse image search it, find the artist, and tag them.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Post it with \"credit to the artist\" in the caption.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Crop the signature out so the post looks cleaner.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You need three facts for a science project. An AI chatbot gives you three, each with a source named underneath. The sources sound right.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Look up each source yourself before any of them goes in.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Check one of them as a spot check and use the others.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Use them. It named sources, which means it checked.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A friend's shared a fundraiser for a charity you've never heard of. Photos, a total raised, a link. Two people you know have already given.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Look the charity up before you donate or share.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Don't donate, don't share, and leave it be.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Share it. Your friend checked, and sharing costs nothing.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Somebody in your game is using slurs in the voice chat. Two other players are answering back. The match has ten minutes left on it.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Mute and report them, then keep playing.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Leave the match.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Answer back so he doesn't get a free pass.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A friend's posted a screenshot of a news headline you're fairly sure isn't real. It's been shared about forty times. The replies are angry.",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Check whether the headline exists on the outlet's own site, then send your friend what you found.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Reply under the post saying it's fake.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Share it with \"is this real?\" so other people can check.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You're applying for a summer program and the form asks for your social accounts. You've got one you made two years ago and haven't opened since.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Read back through the old account yourself before you decide what goes on the form.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Delete the old account and put down only the current one.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Put down only the current one and leave the old one up.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "An app your class uses just lost twenty minutes of your work. You've written a review that says exactly how that felt and you're one tap from posting it.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Send the same information to the developers as a bug report.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Post it. It's accurate and other people should know.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Post it and tag the school account so they see it too.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Your project partner's section is straight off Wikipedia, brackets still sitting in it. It's due in two days and your name's on it too.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Tell him you're not handing it in like that, and offer to rewrite it with him.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Hand it in and tell the teacher afterward which part wasn't yours.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Rewrite his section yourself so it's done.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "During a live class, Cade's posting jokes about the teacher in a side chat he thinks six people can see. The screen share has been on the whole time.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Message Cade right now and tell him the share is on.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Screenshot it and send it to the teacher.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Do nothing. He'll find out.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "A friend's tagged you in a video from a party. You're not doing a thing wrong in it. It's the first thing that comes up when somebody searches your name.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Untag yourself, and check what else your name's attached to while you're in there.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Ask your friend to take the video down.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Leave it and post better things so it drops down the results.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Somebody sends you a screenshot of something you posted last year and says people are passing it around. Reading it back, you don't think that any more.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Say so yourself, once, in your own words, and then let it sit.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Delete the original post and say nothing.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Explain in the replies to everybody who brings it up that they've misread it.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "The teacher writing your recommendation just followed you. You post the way you always have. A friend says you should lock everything down until the letter's written.",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Keep the account as it is, and decide before each post whether you'd be fine with it being seen.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Make the account private and leave it private.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Lock it down until the letter's written, then switch back.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      }
    ]
  },
  "social-intelligence": {
    "id": "social-intelligence",
    "name": "Social Intelligence",
    "slug": "social-intelligence",
    "gameNames": [
      "Social Intelligence"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "What We're Covering",
        "category": null,
        "choices": null
      },
      {
        "title": "The Inciting Incident",
        "category": null,
        "choices": [
          {
            "text": "Fired back publicly",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Went quiet and vented to friends",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Sent Marcus a private DM",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Theater Trap",
        "category": null,
        "choices": [
          {
            "text": "Moved the conversation out of the arena",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Script Lab",
        "category": null,
        "choices": [
          {
            "text": "Attack · Pile-on · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Pile-on · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Named stake · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Named stake · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Pile-on · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Pile-on · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Named stake · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Named stake · Clear ask",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Ally Protocol",
        "category": null,
        "choices": [
          {
            "text": "Defended Sarah in the comments",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Reported quietly and backed her up in private",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Temperature Check",
        "category": null,
        "choices": [
          {
            "text": "Took the three-second reset before replying",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "privacy-security": {
    "id": "privacy-security",
    "name": "Privacy & Security",
    "slug": "privacy-security",
    "gameNames": [
      "Privacy & Security"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 6,
    "steps": [
      {
        "title": "One Saturday, Four Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "The Scam Sort",
        "category": null,
        "choices": [
          {
            "text": "Called it correctly",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Let it past",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Permission Calibration",
        "category": null,
        "choices": [
          {
            "text": "Left the flashlight on, denied the rest",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Password Pressure Test",
        "category": null,
        "choices": [
          {
            "text": "Cleared the bar",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Well past the bar",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The DM Redirect",
        "category": null,
        "choices": [
          {
            "text": "Named all three asks, and nothing that wasn't there",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "professional-brand": {
    "id": "professional-brand",
    "name": "Professional Brand",
    "slug": "professional-brand",
    "gameNames": [
      "Professional Brand"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "One Week, Five Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "What They Find",
        "category": null,
        "choices": [
          {
            "text": "Led with the side project",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the food bank photo",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the team win",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the vent",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the joke",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the meme",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Draft",
        "category": null,
        "choices": [
          {
            "text": "Sent the rewritten version",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Group Project",
        "category": null,
        "choices": [
          {
            "text": "Pulled Luis aside",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Told Luis straight",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Quietly fixed it himself",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Said it in the group chat",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Class Thread",
        "category": null,
        "choices": [
          {
            "text": "Messaged before the screenshot",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Messaged after the screenshot",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Messaged once it was already spreading",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Never pressed it",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Friday",
        "category": null,
        "choices": [
          {
            "text": "First pick",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Second pick",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Third pick",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "digital-citizenship": {
    "id": "digital-citizenship",
    "name": "Digital Citizenship",
    "slug": "digital-citizenship",
    "gameNames": [
      "Digital Citizenship"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "One Week, Five Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "The Source Check",
        "category": null,
        "choices": [
          {
            "text": "Built a stack that holds",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Credit Trail",
        "category": null,
        "choices": [
          {
            "text": "Named her, linked her, asked her",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The One You've Never Heard Of",
        "category": null,
        "choices": [
          {
            "text": "Didn't share it",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The One You Know Is Fake",
        "category": null,
        "choices": [
          {
            "text": "Told Della first, then reported",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Reported first, then told Della",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Toxic Lobby",
        "category": null,
        "choices": [
          {
            "text": "Used the tools and never answered him",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Used the tools, but replied first",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  }
};

export default MODULE_DATA;
