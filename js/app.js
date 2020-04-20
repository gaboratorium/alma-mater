angular.module('app', [
	'ngRoute',
	'ui.router',
	'angular-google-analytics',
	'ngYoutubeEmbed',
	'foundation'
]);

angular.module('app').config(function($stateProvider, $urlRouterProvider, AnalyticsProvider){

	/*UI Router*/
	$urlRouterProvider.otherwise('/');
	$stateProvider
		.state('dashboard', {
			url: "/",
			templateUrl: 'templates/dashboard/dashboard.html',
			controller: 'DashboardController'
		})
		.state('search', {
			url: "/search",
			templateUrl: 'templates/search/search.html',
			controller: 'SearchController'
		})
		.state('upload', {
			url: "/upload",
			templateUrl: 'templates/upload/upload.html',
			controller: 'UploadController'
		})
		.state('profile', {
			url: "/profile/:id",
			templateUrl: 'templates/profile/profile.html',
			controller: 'ProfileController'
		})
		.state('book', {
			url: "/library/:library_id/book/:book_id",
			templateUrl: 'templates/book/book.html',
			controller: 'BookController'
		})
		.state('cafe', {
			url: '/library/:id/cafe',
			templateUrl: 'templates/cafe/cafe.html',
			controller: 'CafeController'
		})
		.state('chapter', {
			url: '/library/:library_id/book/:book_id/chapter/:chapter_id',
			templateUrl: 'templates/chapter/chapter.html',
			controller: 'ChapterController'
		})
		.state('test', {
			url: '/library/:library_id/book/:book_id/test',
			templateUrl: 'templates/test/test.html',
			controller: 'TestController'
		});

	/*Google Analytics*/
	AnalyticsProvider
		.setAccount('UA-77388250-1')
		.logAllCalls(true)
		.trackUrlParams(true);
});

angular.module('app').run(function(Analytics) {});
angular.module('app').controller('BookController', function($scope, $http, $state, BookService, ChapterService, LibraryService, UserService){
	
	var book_id = parseInt($state.params.book_id);
	var library_id = parseInt($state.params.library_id);
	
	if (library_id==0) {
		library={
			id: 0,
			name: 'Előnézet',
			owner: {
				id: 0,
				name: 'Alma Mater Keresés'
			},
			books: [book_id]
		};
		$scope.library = library;
	} else {

		LibraryService.get(library_id).then(function(libraryData){
			injectOwner(libraryData);
		})
	}
	
	BookService.get(book_id).then(function(bookData){
		injectChapters(bookData);
	})

	injectChapters = function(book){
		ChapterService.get().then(function(chapterData){
			//Inject chapters into book
				book.chapters = _.map(book.chapters, function(id){
					return _.find(chapterData, ['id', id]);
				});
				book.chapters = _.pull(book.chapters, undefined);
				$scope.book=book;
			
		});
		
	}

	injectOwner = function(library){
		UserService.get(library.owner).then(function(userData){
			library.owner=userData;
			$scope.library=library;
		})
	}


})
angular.module('app').controller('CafeController', function($scope, $http, $state, LibraryService, BookService, UserService){
	
	var id = parseInt($state.params.id);
	LibraryService.get(id).then(function(libraryData){
		injectBooks(libraryData);
		injectOwner(libraryData);
	})

	injectBooks = function(library){
		BookService.get().then(function(booksData){
			//Inject chapters into book
				library.books = _.map(library.books, function(id){
					return _.find(booksData, ['id', id]);
				});
				library.books = _.pull(library.books, undefined);
				$scope.library=library;
			
		});
		
	}

	injectOwner = function(library){
		UserService.get().then(function(usersData){
			library.owner = _.find(usersData, ['id', library.owner]);
			$scope.library=library;
		})
	}
})
angular.module('app').controller('ChapterController', function($scope, $http, $state, $location, $anchorScroll, ChapterService, LibraryService, BookService, UserService){
	
	var book_id = parseInt($state.params.book_id);
	var chapter_id = parseInt($state.params.chapter_id);
	var library_id = parseInt($state.params.library_id);
	
	$scope.$state=$state;
	$scope.chaptermenu = true;
	$scope.video = true;
	
	LibraryService.get(library_id).then(function(libraryData){
		UserService.get(libraryData.owner).then(function(userData){
			libraryData.owner = userData;
			$scope.library=libraryData;
		})		
	})

	BookService.get(book_id).then(function(bookData){
		$scope.book=bookData;
	})

	ChapterService.get(chapter_id).then(function(data){
		$scope.chapter=data;
		
		$scope.link=data.video;

		$scope.currentTest = $scope.chapter.tests[0];
		$scope.newQuestion();
		$scope.strength=0;
	})

	$scope.scrollTo = function(id){
		$location.hash(id);
		$anchorScroll();
	}

	$scope.giveAnswer = function(isCorrect) {

		// Check answers
		if($scope.check && isCorrect) {
			$scope.check=false;
			$scope.newQuestion();
			return;
		}

		// Give answer
		if(!$scope.check) {
			if (isCorrect && $scope.strength<10) {
				$scope.strength++;
			} else if (!isCorrect && $scope.strength > 0) {
				$scope.strength--;
			}

			$scope.check=true;
		}
	}

	$scope.resetTest = function() {
		$scope.strength = 0;
		$scope.newQuestion();
	}

	$scope.newQuestion = function() {
		var numberOfQuestions = $scope.currentTest.questions.length;
		var randomId = Math.floor(Math.random()*numberOfQuestions);
		$scope.currentQuestion = $scope.currentTest.questions[randomId];

		$scope.randomAnswers = [];
		angular.forEach($scope.currentQuestion.answers, function(answer){
			$scope.randomAnswers.push({
				answer: answer.answer,
				isCorrect: answer.isCorrect,
				rank: 0.5 - Math.random()
			})
		});
	}

	$scope.random = function() {
		return 0.5 - Math.random();
	}
});
angular.module('app').controller('DashboardController', function($scope, $http, $state, LibraryService, BookService, UserService){
	//Get user info
	UserService.get(1).then(function(userData){
		$scope.user = userData;
		//Get all libraries
		LibraryService.get().then(function(librariesData){
			//Select libraries followed by user
			librariesData = _.map($scope.user.following_libraries, function(id){
					return _.find(librariesData, ['id', id])
				})
			//Get books for libraries
			injectBooks(librariesData);
			injectOwners(librariesData);
		});

	})	

	//Inject the corressponding books into libraries
	injectBooks = function(librariesData){
		BookService.get().then(function(booksData){
			//Inject books into libraries
			for (var i=0; i<librariesData.length; i++) {
				librariesData[i].books = _.map(librariesData[i].books, function(id){
					return _.find(booksData, ['id', id]);
				});
				librariesData[i].books = _.pull(librariesData[i].books, undefined);
			}
			$scope.libraries=librariesData;
		});
	}

	//Inject the corressponding owners into libraries
	injectOwners = function(librariesData){
		UserService.get().then(function(userData){
			for (var i=0; i<librariesData.length; i++) {
				librariesData[i].owner =  _.find(userData, ['id', librariesData[i].owner]);
			}
			$scope.libraries=librariesData;
		});
	}
	
});
angular.module('app').controller('ProfileController', function($scope, $state, UserService, LibraryService){
	var id = parseInt($state.params.id);


	if (id==0) {
		$state.go('search');
	}

	UserService.get(id).then(function(userData){
		$scope.user=userData;
		LibraryService.get().then(function(librariesData){

			// librariesData = injectOwners(librariesData);
			
			//created libraries
			$scope.ownLibraries = _.map($scope.user.created_libraries, function(id){
				return _.find(librariesData, ['id', id])
			})

			//following libraries
			$scope.followingLibraries = _.map($scope.user.following_libraries, function(id){
				return _.find(librariesData, ['id', id])
			})

			injectOwners($scope.ownLibraries);
			injectOwners($scope.followingLibraries);

		})
	})

	 $scope.updateProfile = function(name, nationality){
		$scope.user.name = name;
		$scope.user.nationality = nationality;
	}

	//Inject the corressponding owners into libraries
	injectOwners = function(libraries){
		UserService.get().then(function(userData){
			for (var i=0; i<libraries.length; i++) {
				libraries[i].owner =  _.find(userData, ['id', libraries[i].owner]);
			}
		});
	}
})
angular.module('app').controller('SearchController', function($scope, ChapterService, BookService, LibraryService, UserService){
	
	ChapterService.get().then(function(data){
		$scope.chapters=data;
	});

	BookService.get().then(function(data){
		$scope.books=data;
	});

	LibraryService.get().then(function(data){
		$scope.libraries=data;
		injectOwners($scope.libraries);
	});

	//Inject the corressponding owners into libraries
	injectOwners = function(libraries){
		UserService.get().then(function(userData){
			for (var i=0; i<libraries.length; i++) {
				libraries[i].owner =  _.find(userData, ['id', libraries[i].owner]);
			}
		});
	}
})
angular.module('app').controller('TestController', function($scope, $state, UserService, LibraryService, BookService, ChapterService){
	
	var library_id = parseInt($state.params.library_id);
	var book_id = parseInt($state.params.book_id);
	$scope.check=false;


	if (library_id==0) {
		$state.go('search');
	}

	// Get containing book
	BookService.get(book_id).then(function(bookData){
		$scope.book=bookData;
	})

	// Get containing library and library owner name
	LibraryService.get(library_id).then(function(libraryData){
		$scope.library=libraryData;
		UserService.get($scope.library.owner).then(function(userData){
			$scope.user=userData;
			$scope.library.owner={id: $scope.library.owner, name: $scope.user.name};
		})
	})

	// Create current test
	ChapterService.get().then(function(chaptersData){

		chaptersData = _.map($scope.book.chapters, function(id){
			return _.find(chaptersData, ['id', id]);
		});
		chaptersData = _.pull(chaptersData, undefined);

		// Get all the questions
		var questions = [];
		_.forEach(chaptersData, function(chapter){
			_.forEach(chapter.tests[0].questions, function(question){
				questions.push(question);
			})
		})

		// Create new test
		$scope.currentTest = {
			"title": "Epic ultimate test",
			questions: questions
		}

		// Start new test
		$scope.newQuestion();
		$scope.strength=0;

	})

	$scope.giveAnswer = function(isCorrect) {

		// Check answers
		if($scope.check && isCorrect) {
			$scope.check=false;
			$scope.newQuestion();
			return;
		}

		// Give answer
		if(!$scope.check) {
			if (isCorrect && $scope.strength<10) {
				$scope.strength++;
			} else if (!isCorrect && $scope.strength > 0) {
				$scope.strength--;
			}

			$scope.check=true;
		}
	}

	$scope.resetTest = function() {
		$scope.strength = 0;
		$scope.newQuestion();
	}

	$scope.newQuestion = function() {
		var numberOfQuestions = $scope.currentTest.questions.length;
		var randomId = Math.floor(Math.random()*numberOfQuestions);
		$scope.currentQuestion = $scope.currentTest.questions[randomId];

		$scope.randomAnswers = [];
		angular.forEach($scope.currentQuestion.answers, function(answer){
			$scope.randomAnswers.push({
				answer: answer.answer,
				isCorrect: answer.isCorrect,
				rank: 0.5 - Math.random()
			})
		});
	}
})
angular.module('app').controller('UploadController', function($scope, UserService, LibraryService){
	
	UserService.get(1).then(function(userData){
		$scope.user=userData;
		LibraryService.get().then(function(librariesData){
			
			//created libraries
			var ownLibraries = _.map($scope.user.created_libraries, function(id){
				return _.find(librariesData, ['id', id])
			})

			//following libraries
			var followingLibraries = _.map($scope.user.following_libraries, function(id){
				return _.find(librariesData, ['id', id])
			})

			$scope.libraries = _.concat(ownLibraries, followingLibraries);
			injectOwners($scope.libraries);

		})
	})

	//Inject the corressponding owners into libraries
	injectOwners = function(libraries){
		UserService.get().then(function(userData){
			for (var i=0; i<libraries.length; i++) {
				libraries[i].owner =  _.find(userData, ['id', libraries[i].owner]);
			}
		});
	}

});
angular.module('app').directive('currentState', function($state){
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			 if ($state.current.name == attr.currentState) {
			 	element.addClass('active');
			 }
		}
	}
});
angular.module('app').directive('gbCheckbox', function($window){
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			 element.bind("click", function() {
			 	if (element.hasClass("active")){
			 		element.removeClass("active")
			 	} else {

                    element.addClass('active');
			 	}
			})
		}
	}
});
angular.module('app').directive('inlineOnState', function($state){
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			element.css('display', 'none')
			 if ($state.current.name == attr.inlineOnState) {
			 	element.css('display', 'inline');
			 }
		}
	}
});
// angular.module('app').directive('scrollNavigation', function($window){
// 	return {
// 		restrict: 'A',
// 		link: function(scope, element, attr) {
// 			var target = angular.element('#target');
// 			// console.log(attr.scrollNavigation);
// 			console.log(target);
// 						// var target = angular.element(document.querySelectorAll("[id="+ attr.scrollNavigation +"]")).removeClass('active');

// 			 angular.element($window).bind("scroll", function() {
// 	            if (this.pageYOffset >= target.offset().top) {
// 	                 scope.boolChangeClass = true;
// 	                 element.addClass('active');
// 	             } else {
// 	                 scope.boolChangeClass = false;
// 	                 element.removeClass('active');
// 	             }
// 	            console.log("You are scrolling!");

// 			})
// 		}
// 	}
// });
angular.module('app').directive('listOnState', function($state){
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			element.css('display', 'none')
			 if ($state.current.name == attr.listOnState) {
			 	element.css('display', 'list-item');
			 }
		}
	}
});
angular.module('app').directive('strengthProgress', function($document){
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			scope.$watch("strength", function(){
				element.css("width", scope.strength*10+"%");
			})
		}
	}
});
angular.module('app').service('BookService', function($http, $q){
	//Get books
	//Api call goes here...
	this.get = function(id){
		var deferred = $q.defer();
		$http.get('db/books.json')
			.success(function(data){
				if (id) {
					data = _.find(data.books, {id: id});
					deferred.resolve(data);
				} else { 
					deferred.resolve(data.books);
				}
			})
			.error(function(data, status, headers, config){
				deferred.reject(status);
			});
		return deferred.promise;
	}
});
angular.module('app').service('ChapterService', function($http, $q){
	
	//Get chapters
	//Api call goes here...
	this.get = function(id){
		var deferred = $q.defer();
		$http.get('db/chapters.json')
			.success(function(data){
				if (id) {
					data = _.find(data.chapters, {id: id});
					deferred.resolve(data);
				} else { 
					deferred.resolve(data.chapters);
				}
			})
			.error(function(data, status, headers, config){
				deferred.reject(status);
			});
		return deferred.promise;
	}
});
angular.module('app').service('LibraryService', function($http, $q){
	//Api call goes here...
	this.get = function(id){
		var deferred = $q.defer();
		$http.get('db/libraries.json')
			.success(function(data){
				if (id) {
					data = _.find(data.libraries, {id: id});
					deferred.resolve(data);
				} else { 
					deferred.resolve(data.libraries);
				}
			})
			.error(function(data, status, headers, config){
				deferred.reject(status);
			});
		return deferred.promise;
	}
});
angular.module('app').service('UserService', function($http, $q){
	//Get courses
	//Api call goes here...
	this.get = function(id){
		var deferred = $q.defer();
		$http.get('db/users.json')
			.success(function(data){
				if (id) {
					data = _.find(data.users, {id: id});
					deferred.resolve(data);
				} else { 
					deferred.resolve(data.users);
				}
			})
			.error(function(data, status, headers, config){
				deferred.reject(status);
			});
		return deferred.promise;
	}
});