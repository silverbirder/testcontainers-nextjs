docker-build:
	docker build . -t app:latest 

docker-test:
	container-structure-test test \
	--image app:latest \
	--platform linux/amd64 \
	--config container-structure-test.config.yaml
