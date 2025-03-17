pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_IMAGE = 'monuser/simple-web-app'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        KUBE_CONFIG = credentials('kubeconfig')
        APP_URL = 'http://simple-web-app-service.default.svc.cluster.local'
    }
    stages {
        // Étape 1 : Récupérer le code
        stage('Checkout') {
            steps {
                echo 'Récupération du code depuis Git...'
                git 'https://github.com/monuser/simple-web-app.git'
            }
        }

        // Étape 2 : Construire les dépendances
        stage('Build') {
            steps {
                echo 'Installation des dépendances avec npm...'
                sh 'npm install'
            }
        }

        // Étape 3 : Analyse avec KICS
        stage('KICS Scan') {
            steps {
                echo 'Analyse des fichiers IaC avec KICS...'
                script {
                    sh '''
                    docker run --rm -v ${WORKSPACE}:/path checkmarx/kics:latest scan \
                        -p /path/k8s \
                        -o /path/kics-results.json \
                        --report-formats json
                    '''
                    def kicsResults = readFile('kics-results.json')
                    echo "Résultats KICS : ${kicsResults}"
                    if (kicsResults.contains('"severity": "HIGH"')) {
                        error 'KICS a trouvé des vulnérabilités HIGH dans les fichiers IaC !'
                    } else {
                        echo '✔ KICS : Aucune vulnérabilité critique détectée'
                    }
                }
            }
        }

        // Étape 4 : Construire l’image Docker
        stage('Build Docker Image') {
            steps {
                echo 'Construction de l’image Docker...'
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
            }
        }

        // Étape 5 : Pousser l’image Docker
        stage('Push Docker Image') {
            steps {
                echo 'Pousse de l’image vers Docker Hub...'
                withDockerRegistry([credentialsId: 'dockerhub-credentials', url: "https://${DOCKER_REGISTRY}"]) {
                    sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }

        // Étape 6 : Déployer sur Kubernetes
        stage('Deploy to Kubernetes') {
            steps {
                echo 'Déploiement sur Kubernetes...'
                sh "kubectl --kubeconfig=${KUBE_CONFIG} apply -f k8s/deployment.yaml"
                sh "kubectl --kubeconfig=${KUBE_CONFIG} set image deployment/simple-web-app simple-web-app=${DOCKER_IMAGE}:${DOCKER_TAG} -n default"
                sh "kubectl --kubeconfig=${KUBE_CONFIG} rollout status deployment/simple-web-app -n default"
            }
        }

        // Étape 7 : Valider le déploiement
        stage('Validation') {
            steps {
                echo 'Validation du déploiement...'
                sh "kubectl --kubeconfig=${KUBE_CONFIG} get pods -n default -l app=simple-web-app --field-selector=status.phase=Running"
                sh "curl --retry 5 --retry-delay 5 --fail ${APP_URL} || exit 1"
                echo '✔ Application déployée et accessible !'
            }
        }
    }
    post {
        success {
            echo 'Pipeline terminée avec succès !'
        }
        failure {
            echo 'Échec de la pipeline. Rollback en cours...'
            sh "kubectl --kubeconfig=${KUBE_CONFIG} rollout undo deployment/simple-web-app -n default"
        }
    }
}